const pool = require('../db')
const {
  sendReservationAcknowledgement,
  sendReservationStatusEmail,
  sendManagerNewReservationNotification,
  sendClientCancellationEmail,
  sendManagerClientCancellationNotification
} = require('./reservationMailer')
const openingHours = require('./openingHours')
const { allocateTables, MAX_AUTO_ASSIGN_SEATS } = require('./tableAllocator')

const RESERVATION_DURATION_MIN = openingHours.RESERVATION_DURATION_MIN

const SETTINGS_KEYS = {
  tableMerges: 'table_merges_v1',
  terraceLayoutVersion: 'terrace_layout_version_v1',
  interiorLayoutVersion: 'interior_layout_version_v1',
  lunchDisabled: 'lunch_disabled_v1',
  kitchenClosure: 'kitchen_closure_v1',
  siteAnnouncement: 'site_announcement_v1'
}

const KITCHEN_CLOSURE_DEFAULT = { active: false, from: null, to: null, message: '', scope: 'cuisine' }
const SITE_ANNOUNCEMENT_DEFAULT = { active: false, from: null, to: null, message: '' }
const CLOSURE_SCOPES = new Set(['cuisine', 'restaurant'])
const MAX_CLOSURE_MESSAGE_LEN = 400

const REPORT_TIME_ZONE = process.env.APP_TIMEZONE || 'Europe/Brussels'
// Date du jour (YYYY-MM-DD) dans le fuseau du restaurant.
const todayISOInZone = () => {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: REPORT_TIME_ZONE })
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

const TERRACE_LAYOUT_VERSION_TARGET = '3'
const INTERIOR_LAYOUT_VERSION_TARGET = '4'

const DEFAULT_TABLES = [
  { id: 'T2-1', code: 'T-1', seats: 2, zone: 'interieur', x: 28, y: 17 },
  { id: 'T2-2', code: 'T-2', seats: 2, zone: 'interieur', x: 38, y: 17 },
  { id: 'T2-3', code: 'T-3', seats: 2, zone: 'interieur', x: 48, y: 17 },
  { id: 'T2-4', code: 'T-4', seats: 2, zone: 'interieur', x: 58, y: 17 },
  { id: 'T2-5', code: 'T-5', seats: 2, zone: 'interieur', x: 68, y: 17 },
  { id: 'T4-1', code: 'T-6', seats: 2, zone: 'interieur', x: 18, y: 42 },
  { id: 'T4-2', code: 'T-7', seats: 2, zone: 'interieur', x: 44, y: 45 },
  { id: 'T4-3', code: 'T-8', seats: 2, zone: 'interieur', x: 54, y: 45 },
  { id: 'T4-4', code: 'T-9', seats: 2, zone: 'interieur', x: 80, y: 34 },
  { id: 'T10-1', code: 'T-10', seats: 2, zone: 'interieur', x: 80, y: 49 },
  { id: 'T2-6', code: 'T-22', seats: 2, zone: 'interieur', x: 40, y: 36 },
  { id: 'T2-7', code: 'T-23', seats: 6, zone: 'interieur', x: 55, y: 36 },
  { id: 'T2-9', code: 'T-25', seats: 2, zone: 'interieur', x: 40, y: 52 },
  { id: 'T2-10', code: 'T-26', seats: 2, zone: 'interieur', x: 50, y: 52 },
  { id: 'T2-11', code: 'T-27', seats: 6, zone: 'interieur', x: 55, y: 56 },
  { id: 'TR2-1', code: 'T-11', seats: 2, zone: 'terrasse', x: 16, y: 22 },
  { id: 'TR2-2', code: 'T-12', seats: 2, zone: 'terrasse', x: 30, y: 22 },
  { id: 'TR2-3', code: 'T-13', seats: 2, zone: 'terrasse', x: 44, y: 22 },
  { id: 'TR2-4', code: 'T-14', seats: 2, zone: 'terrasse', x: 58, y: 22 },
  { id: 'TR2-5', code: 'T-15', seats: 2, zone: 'terrasse', x: 72, y: 22 },
  { id: 'TR2-6', code: 'T-16', seats: 2, zone: 'terrasse', x: 86, y: 22 },
  { id: 'TR4-1', code: 'T-17', seats: 4, zone: 'terrasse', x: 24, y: 48 },
  { id: 'TR4-2', code: 'T-18', seats: 4, zone: 'terrasse', x: 44, y: 48 },
  { id: 'TR4-3', code: 'T-19', seats: 4, zone: 'terrasse', x: 64, y: 48 },
  { id: 'TR4-4', code: 'T-20', seats: 4, zone: 'terrasse', x: 84, y: 48 },
  { id: 'TR6-1', code: 'T-21', seats: 6, zone: 'terrasse', x: 54, y: 76 },
  { id: 'T6-1', code: 'T-29', seats: 6, zone: 'interieur', x: 30, y: 65 }
]

const DEFAULT_TABLE_BY_CODE = Object.fromEntries(DEFAULT_TABLES.map((table) => [table.code, table]))

let initPromise = null

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const TABLE_SIZE_SCALE = 0.7
const BASE_RECT_TABLE_WIDTH = 11 * TABLE_SIZE_SCALE
const BASE_RECT_TABLE_HEIGHT = clamp((8 + 2 * 1.6) * TABLE_SIZE_SCALE, 12 * TABLE_SIZE_SCALE, 30 * TABLE_SIZE_SCALE)
const WIDE_INTERIOR_TABLE_CODES = new Set(['T-23', 'T-27', 'T-29'])
const pad2 = (value) => String(value).padStart(2, '0')

const toMinutes = (value) => {
  const [hours, minutes] = String(value || '00:00').split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0
  return hours * 60 + minutes
}

const fromMinutes = (totalMinutes) => {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${pad2(hours)}:${pad2(minutes)}`
}

const normalizeDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  return `${match[1]}-${match[2]}-${match[3]}`
}

const normalizeTime = (value) => {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return `${pad2(hours)}:${pad2(minutes)}`
}

const normalizeEmail = (value) => {
  const email = String(value || '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

const normalizePhone = (value) => {
  const phone = String(value || '').trim()
  if (!phone) return null
  if (phone.length > 30) return null
  // Tolère chiffres, espaces, +, -, ., ( ), /
  if (!/^[\d\s+().\-/]+$/.test(phone)) return null
  return phone
}

// Groupe maximum accepté en ligne. Au-delà de MAX_AUTO_ASSIGN_SEATS couverts,
// la demande est enregistrée sans table et placée par l'admin.
const MAX_GROUP_SIZE = 18

const MAX_NAME_LEN = 120
const MAX_EMAIL_LEN = 200
const MAX_MESSAGE_LEN = 2000
const MAX_COMPANY_LEN = 200
const MAX_VAT_LEN = 30

const truncSafe = (value, max) => {
  const s = String(value || '').trim()
  return s.length > max ? null : s
}

const overlaps = (startA, endA, startB, endB) => startA < endB && startB < endA

const getTableRectHeight = (seats) =>
  clamp(
    (8 + Number(seats || 0) * 1.6) * TABLE_SIZE_SCALE,
    12 * TABLE_SIZE_SCALE,
    30 * TABLE_SIZE_SCALE
  )
const getTableRoundDiameter = (seats) =>
  clamp(
    (8 + Number(seats || 0) * 1.7) * TABLE_SIZE_SCALE,
    11 * TABLE_SIZE_SCALE,
    20 * TABLE_SIZE_SCALE
  )

const getInteriorRectSize = (table) => {
  if (WIDE_INTERIOR_TABLE_CODES.has(String(table?.code || ''))) {
    return {
      width: BASE_RECT_TABLE_WIDTH * 1.8,
      height: BASE_RECT_TABLE_HEIGHT
    }
  }

  return {
    width: BASE_RECT_TABLE_WIDTH,
    height: getTableRectHeight(table?.seats)
  }
}

const hasSameMembers = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  return a.every((id, index) => id === b[index])
}

const normalizeMergeGroups = (groups, validIds, tableZonesById = null) => {
  const validSet = validIds instanceof Set ? validIds : new Set(validIds || [])
  const zoneMap = tableZonesById && typeof tableZonesById === 'object' ? tableZonesById : null
  const validGroups = (Array.isArray(groups) ? groups : [])
    .filter((group) => Array.isArray(group))
    .flatMap((group) => {
      const deduped = Array.from(
        new Set(
          group
            .map((id) => String(id || '').trim())
            .filter((id) => id && validSet.has(id))
        )
      )
      if (!zoneMap) return [deduped]

      const byZone = deduped.reduce(
        (acc, id) => {
          const zone = String(zoneMap[id] || '').trim().toLowerCase() === 'terrasse' ? 'terrasse' : 'interieur'
          acc[zone].push(id)
          return acc
        },
        { interieur: [], terrasse: [] }
      )

      return [byZone.interieur, byZone.terrasse]
    })
    .filter((group) => group.length > 1)

  const merged = []
  validGroups.forEach((group) => {
    const touching = merged.filter((existing) => existing.some((id) => group.includes(id)))
    if (!touching.length) {
      merged.push([...group])
      return
    }

    const combined = new Set(group)
    touching.forEach((existing) => existing.forEach((id) => combined.add(id)))

    for (let index = merged.length - 1; index >= 0; index -= 1) {
      if (touching.includes(merged[index])) merged.splice(index, 1)
    }

    merged.push(Array.from(combined))
  })

  return merged
    .map((group) => group.sort((a, b) => a.localeCompare(b)))
    .sort((a, b) => a[0].localeCompare(b[0]))
}

const getMergedUnitCode = (sortedMembers, mergedGroups) => {
  const groupIndex = mergedGroups.findIndex((group) => hasSameMembers(group, sortedMembers))
  return `T-G${groupIndex >= 0 ? groupIndex + 1 : 1}`
}

// Échappement complet pour insertion dans HTML (textarea/script).
// Couvre </script>, </textarea>, separators U+2028 / U+2029.
const serializeStateForScript = (state) =>
  JSON.stringify(state)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")

const createError = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

const ensureRuntimeSchema = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS reservation_tables (
      reservation_id integer NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      table_id integer NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
      PRIMARY KEY (reservation_id, table_id)
    )
  `)

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_reservation_tables_table_id
    ON reservation_tables(table_id)
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS admin_blocks (
      id text PRIMARY KEY,
      table_id integer NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
      date date NOT NULL,
      start_time time NOT NULL,
      end_minutes integer NOT NULL,
      reason text DEFAULT 'Arrivée sans réservation',
      created_at timestamptz DEFAULT now()
    )
  `)

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_blocks_date_table
    ON admin_blocks(date, table_id)
  `)

  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reservations' AND column_name = 'status'
      ) THEN
        ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
        ALTER TABLE reservations
          ADD CONSTRAINT reservations_status_check CHECK (status IN ('pending','confirmed','cancelled'));
        ALTER TABLE reservations ALTER COLUMN status SET DEFAULT 'pending';
      END IF;
    END $$;
  `)

  await client.query(`
    ALTER TABLE quote_requests
    ADD COLUMN IF NOT EXISTS request_kind text,
    ADD COLUMN IF NOT EXISTS first_name text,
    ADD COLUMN IF NOT EXISTS last_name text,
    ADD COLUMN IF NOT EXISTS company_name text,
    ADD COLUMN IF NOT EXISTS company_contact_name text,
    ADD COLUMN IF NOT EXISTS vat_number text,
    ADD COLUMN IF NOT EXISTS peppol_id text
  `)

  await client.query(`
    ALTER TABLE news_images
    ADD COLUMN IF NOT EXISTS cloudinary_id text
  `)

  await client.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false
  `)

  // Agrégats journaliers des réservations.
  // Les réservations sont purgées au bout d'1 jour (10 pour les annulées) :
  // sans cette table, aucune analyse au-delà de la semaine n'est possible.
  await client.query(`
    CREATE TABLE IF NOT EXISTS reservation_stats_daily (
      stat_date date NOT NULL,
      service text NOT NULL CHECK (service IN ('lunch', 'evening')),
      reservations integer NOT NULL DEFAULT 0,
      confirmed integer NOT NULL DEFAULT 0,
      covers integer NOT NULL DEFAULT 0,
      no_shows integer NOT NULL DEFAULT 0,
      cancelled integer NOT NULL DEFAULT 0,
      online_count integer NOT NULL DEFAULT 0,
      phone_count integer NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      PRIMARY KEY (stat_date, service)
    )
  `)

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_reservation_stats_daily_date
    ON reservation_stats_daily(stat_date)
  `)

  console.log('✓ Schema BDD vérifié')
}

// Heure limite qui sépare le service du midi de celui du soir.
const LUNCH_SERVICE_CUTOFF = '16:00'

// Recalcule les agrégats depuis les réservations encore en base et les fusionne
// dans reservation_stats_daily.
//
// GREATEST est volontaire : une date déjà archivée voit ses lignes disparaître
// progressivement (les non-annulées après 1 jour, les annulées après 10). Un
// simple écrasement remplacerait alors un archivage correct par des zéros.
const captureReservationStats = async (executor = pool) => {
  await executor.query(
    `
    INSERT INTO reservation_stats_daily AS s (
      stat_date,
      service,
      reservations,
      confirmed,
      covers,
      no_shows,
      cancelled,
      online_count,
      phone_count,
      updated_at
    )
    SELECT
      r.date,
      CASE WHEN r.time_start < TIME '${LUNCH_SERVICE_CUTOFF}' THEN 'lunch' ELSE 'evening' END,
      COUNT(*) FILTER (WHERE r.status <> 'cancelled'),
      COUNT(*) FILTER (WHERE r.status = 'confirmed'),
      COALESCE(SUM(r.covers) FILTER (WHERE r.status <> 'cancelled'), 0),
      COUNT(*) FILTER (WHERE r.status <> 'cancelled' AND r.no_show IS TRUE),
      COUNT(*) FILTER (WHERE r.status = 'cancelled'),
      COUNT(*) FILTER (WHERE r.status <> 'cancelled' AND r.source = 'online'),
      COUNT(*) FILTER (WHERE r.status <> 'cancelled' AND r.source = 'phone'),
      now()
    FROM reservations r
    GROUP BY 1, 2
    ON CONFLICT (stat_date, service) DO UPDATE SET
      reservations = GREATEST(s.reservations, EXCLUDED.reservations),
      confirmed    = GREATEST(s.confirmed,    EXCLUDED.confirmed),
      covers       = GREATEST(s.covers,       EXCLUDED.covers),
      no_shows     = GREATEST(s.no_shows,     EXCLUDED.no_shows),
      cancelled    = GREATEST(s.cancelled,    EXCLUDED.cancelled),
      online_count = GREATEST(s.online_count, EXCLUDED.online_count),
      phone_count  = GREATEST(s.phone_count,  EXCLUDED.phone_count),
      updated_at   = now()
    `
  )
}

const purgeOldReservations = async () => {
  await ensureInitialized()

  // Archiver AVANT de supprimer, sinon la donnée est perdue définitivement.
  await captureReservationStats()

  await pool.query(
    `
    DELETE FROM reservations
    WHERE (status = 'cancelled' AND date < CURRENT_DATE - INTERVAL '10 days')
       OR (status <> 'cancelled' AND date < CURRENT_DATE - INTERVAL '1 day')
    `
  )
}

const ensureDefaultTables = async (client) => {
  const { rows } = await client.query('SELECT code FROM tables')
  const existingCodes = new Set((rows || []).map((row) => String(row.code || '').trim()))

  for (const table of DEFAULT_TABLES) {
    if (existingCodes.has(table.code)) continue
    await client.query(
      `
        INSERT INTO tables (code, seats, zone, pos_x, pos_y, is_active, live_status)
        VALUES ($1, $2, $3, $4, $5, true, 'free')
      `,
      [table.code, table.seats, table.zone, table.x, table.y]
    )
  }
}

const ensureSettingsDefaults = async (client) => {
  await client.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
    [SETTINGS_KEYS.tableMerges, '[]']
  )
  await client.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
    [SETTINGS_KEYS.lunchDisabled, 'false']
  )
  await client.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
    [SETTINGS_KEYS.kitchenClosure, JSON.stringify(KITCHEN_CLOSURE_DEFAULT)]
  )
  await client.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
    [SETTINGS_KEYS.siteAnnouncement, JSON.stringify(SITE_ANNOUNCEMENT_DEFAULT)]
  )
}

const ensureTerraceLayoutVersion = async (client) => {
  const { rows } = await client.query('SELECT value FROM settings WHERE key = $1', [
    SETTINGS_KEYS.terraceLayoutVersion
  ])

  const currentVersion = String(rows?.[0]?.value || '')
  if (currentVersion === TERRACE_LAYOUT_VERSION_TARGET) return

  const terraceDefaults = DEFAULT_TABLES.filter((table) => table.zone === 'terrasse')

  for (const table of terraceDefaults) {
    await client.query('UPDATE tables SET pos_x = $1, pos_y = $2 WHERE code = $3', [
      table.x,
      table.y,
      table.code
    ])
  }

  await client.query(
    `
      INSERT INTO settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value
    `,
    [SETTINGS_KEYS.terraceLayoutVersion, TERRACE_LAYOUT_VERSION_TARGET]
  )
}

const ensureInteriorLayoutVersion = async (client) => {
  const { rows } = await client.query('SELECT value FROM settings WHERE key = $1', [
    SETTINGS_KEYS.interiorLayoutVersion
  ])

  const currentVersion = String(rows?.[0]?.value || '')
  if (currentVersion === INTERIOR_LAYOUT_VERSION_TARGET) return

  const interiorDefaults = DEFAULT_TABLES.filter((table) => table.zone === 'interieur')

  for (const table of interiorDefaults) {
    await client.query(
      'UPDATE tables SET seats = $1, pos_x = $2, pos_y = $3 WHERE code = $4',
      [table.seats, table.x, table.y, table.code]
    )
  }

  const interiorCodes = interiorDefaults.map((table) => table.code)

  await client.query('UPDATE tables SET is_active = false WHERE zone = $1 AND code <> ALL($2::text[])', [
    'interieur',
    interiorCodes
  ])

  await client.query('UPDATE tables SET is_active = true WHERE code = ANY($1::text[])', [interiorCodes])

  await client.query(
    `
      INSERT INTO settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value
    `,
    [SETTINGS_KEYS.interiorLayoutVersion, INTERIOR_LAYOUT_VERSION_TARGET]
  )
}

const ensureInitialized = async () => {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      await ensureRuntimeSchema(client)
      await ensureDefaultTables(client)
      await ensureSettingsDefaults(client)
      await ensureInteriorLayoutVersion(client)
      await ensureTerraceLayoutVersion(client)
      // Rattrapage : archive ce qui est encore en base au démarrage.
      await captureReservationStats(client)
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
  })()

  return initPromise
}

const listTables = async () => {
  await ensureInitialized()

  const client = await pool.connect()
  let rows = []

  try {
    await client.query('BEGIN')
    await ensureDefaultTables(client)
    const result = await client.query(`
      SELECT
        id,
        code,
        seats,
        zone,
        pos_x::float8 AS pos_x,
        pos_y::float8 AS pos_y,
        is_active
      FROM tables
      WHERE is_active = true
      ORDER BY id ASC
    `)
    rows = result.rows || []
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }

  return rows.map((row) => {
    const defaults = DEFAULT_TABLE_BY_CODE[row.code] || { id: String(row.id), x: 10, y: 10 }
    const x = Number.isFinite(Number(row.pos_x)) ? Number(row.pos_x) : defaults.x
    const y = Number.isFinite(Number(row.pos_y)) ? Number(row.pos_y) : defaults.y

    return {
      id: defaults.id || String(row.id),
      dbId: String(row.id),
      code: row.code,
      label: row.code,
      seats: Number(row.seats),
      zone: row.zone,
      isActive: row.is_active !== false,
      x: clamp(x, 3, 97),
      y: clamp(y, 3, 97)
    }
  })
}

const getTableLayoutMap = (tables) => {
  const layout = {}

  tables.forEach((table) => {
    const isTerrace = table.zone === 'terrasse'
    const interiorRect = isTerrace ? null : getInteriorRectSize(table)
    const width = isTerrace ? getTableRoundDiameter(table.seats) : interiorRect.width
    const height = isTerrace ? width : interiorRect.height
    layout[table.id] = {
      x: table.x,
      y: table.y,
      w: width,
      h: height,
      shape: isTerrace ? 'round' : 'rect'
    }
  })

  return layout
}

const getTableMerges = async (validIds, tableZonesById = null) => {
  await ensureInitialized()

  const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [
    SETTINGS_KEYS.tableMerges
  ])

  const raw = rows?.[0]?.value || '[]'

  try {
    const parsed = JSON.parse(raw)
    return normalizeMergeGroups(parsed, validIds, tableZonesById)
  } catch {
    return []
  }
}

const setTableMerges = async (groups, validIds, tableZonesById = null) => {
  await ensureInitialized()

  const normalized = normalizeMergeGroups(groups, validIds, tableZonesById)

  await pool.query(
    `
      INSERT INTO settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value
    `,
    [SETTINGS_KEYS.tableMerges, JSON.stringify(normalized)]
  )

  return normalized
}

const listReservations = async (tables, tableMerges, options = {}) => {
  await ensureInitialized()
  await purgeOldReservations()

  const statuses = Array.isArray(options.statuses) && options.statuses.length
    ? options.statuses.map((s) => String(s || '').trim().toLowerCase())
    : null
  const statusClause = statuses ? 'r.status = ANY($1)' : 'TRUE'
  const params = statuses ? [statuses] : []

  const tableByUiId = Object.fromEntries(tables.map((table) => [table.id, table]))
  const dbIdToUiId = Object.fromEntries(tables.map((table) => [String(table.dbId), table.id]))

  const { rows } = await pool.query(`
    SELECT
      r.id,
      r.table_id,
      r.date::text AS date,
      to_char(r.time_start, 'HH24:MI') AS time_start,
      r.covers,
      r.name,
      r.email,
      r.phone,
      r.message,
      r.source,
      r.status,
      r.no_show,
      r.created_at,
      COALESCE(
        array_agg(rt.table_id ORDER BY rt.table_id)
        FILTER (WHERE rt.table_id IS NOT NULL),
        ARRAY[]::integer[]
      ) AS member_ids
    FROM reservations r
    LEFT JOIN reservation_tables rt
      ON rt.reservation_id = r.id
    WHERE ${statusClause}
    GROUP BY r.id
    ORDER BY r.date DESC, r.time_start ASC, r.id DESC
  `,
  params)

  return rows.map((row) => {
    const memberIds = Array.isArray(row.member_ids)
      ? row.member_ids.map((id) => dbIdToUiId[String(id)]).filter(Boolean)
      : []
    const fallbackMember = row.table_id ? [dbIdToUiId[String(row.table_id)]].filter(Boolean) : []
    const members = (memberIds.length ? memberIds : fallbackMember)
      .filter((memberId) => Boolean(tableByUiId[memberId]))
      .sort((a, b) => a.localeCompare(b))

    const seats = members.reduce((sum, memberId) => sum + (tableByUiId[memberId]?.seats || 0), 0)

    let tableLabel = ''
    let tableId = ''

    if (members.length === 1) {
      tableId = members[0]
      tableLabel = tableByUiId[members[0]]?.code || members[0]
    } else if (members.length > 1) {
      tableId = `GROUP:${members.join('+')}`
      tableLabel = getMergedUnitCode(members, tableMerges)
    }

    return {
      id: String(row.id),
      name: row.name,
      email: row.email || '',
      phone: row.phone || '',
      people: Number(row.covers) || 0,
      date: row.date,
      time: row.time_start,
      tableId,
      tableLabel,
      tableSeats: seats,
      tableMembers: members,
      message: row.message || '',
      source: row.source || 'online',
      status: row.status || 'confirmed',
      noShow: row.no_show || false,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || '')
    }
  })
}

const listAdminBlocks = async (tables) => {
  await ensureInitialized()

  const dbIdToUiId = Object.fromEntries(tables.map((table) => [String(table.dbId), table.id]))

  const { rows } = await pool.query(`
    SELECT
      id,
      table_id,
      date::text AS date,
      to_char(start_time, 'HH24:MI') AS start_time,
      end_minutes,
      reason,
      created_at
    FROM admin_blocks
    ORDER BY date DESC, start_time DESC
  `)

  return rows
    .map((row) => {
      const tableId = dbIdToUiId[String(row.table_id)]
      if (!tableId) return null

      const endMinutes = Number(row.end_minutes)

      return {
        id: String(row.id),
        tableId,
        date: row.date,
        startTime: row.start_time,
        endMinutes,
        endTime: fromMinutes(endMinutes),
        reason: row.reason || 'Arrivée sans réservation',
        createdAt:
          row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || '')
      }
    })
    .filter(Boolean)
}

const getLunchDisabled = async () => {
  await ensureInitialized()
  const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [
    SETTINGS_KEYS.lunchDisabled
  ])
  return rows?.[0]?.value === 'true'
}

const setLunchDisabled = async (value) => {
  await ensureInitialized()
  const normalized = Boolean(value)
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [SETTINGS_KEYS.lunchDisabled, normalized ? 'true' : 'false']
  )
  return normalized
}

// Normalise l'objet de fermeture réservations. `active` effectif seulement si
// une plage complète et cohérente (from <= to) est fournie.
const normalizeKitchenClosure = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const from = normalizeDate(source.from)
  const to = normalizeDate(source.to)
  const message = truncSafe(source.message, MAX_CLOSURE_MESSAGE_LEN) || ''
  const scope = CLOSURE_SCOPES.has(String(source.scope || '').trim()) ? String(source.scope).trim() : 'cuisine'
  const rangeValid = Boolean(from && to && from <= to)
  const active = Boolean(source.active) && rangeValid
  return { active, from: rangeValid ? from : null, to: rangeValid ? to : null, message, scope }
}

const getKitchenClosure = async () => {
  await ensureInitialized()
  const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [
    SETTINGS_KEYS.kitchenClosure
  ])
  try {
    return normalizeKitchenClosure(JSON.parse(rows?.[0]?.value || '{}'))
  } catch {
    return { ...KITCHEN_CLOSURE_DEFAULT }
  }
}

const setKitchenClosure = async (payload) => {
  await ensureInitialized()
  const normalized = normalizeKitchenClosure(payload)
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [SETTINGS_KEYS.kitchenClosure, JSON.stringify(normalized)]
  )
  return normalized
}

// Vrai si la date (YYYY-MM-DD) tombe dans une fermeture réservations active.
const isDateWithinClosure = (closure, date) => {
  if (!closure?.active || !closure.from || !closure.to || !date) return false
  return date >= closure.from && date <= closure.to
}

// Annonce site — indépendante d'une fermeture. Bornes d'affichage optionnelles.
const normalizeSiteAnnouncement = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const from = normalizeDate(source.from)
  const to = normalizeDate(source.to)
  const message = truncSafe(source.message, MAX_CLOSURE_MESSAGE_LEN) || ''
  // Fenêtre valide si absente, ou si les deux bornes cohérentes.
  const rangeValid = (!from && !to) || Boolean(from && to && from <= to)
  const active = Boolean(source.active) && rangeValid && Boolean(message)
  return { active, from: rangeValid ? from : null, to: rangeValid ? to : null, message }
}

const getSiteAnnouncement = async () => {
  await ensureInitialized()
  const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [
    SETTINGS_KEYS.siteAnnouncement
  ])
  try {
    return normalizeSiteAnnouncement(JSON.parse(rows?.[0]?.value || '{}'))
  } catch {
    return { ...SITE_ANNOUNCEMENT_DEFAULT }
  }
}

const setSiteAnnouncement = async (payload) => {
  await ensureInitialized()
  const normalized = normalizeSiteAnnouncement(payload)
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [SETTINGS_KEYS.siteAnnouncement, JSON.stringify(normalized)]
  )
  return normalized
}

// Annonce visible aujourd'hui si active + message + dans la fenêtre (bornes optionnelles).
const isAnnouncementVisible = (ann, todayISO) => {
  if (!ann?.active || !ann.message) return false
  if (ann.from && todayISO < ann.from) return false
  if (ann.to && todayISO > ann.to) return false
  return true
}

// Bandeaux publics à afficher aujourd'hui (fermeture auto-annoncée + annonce planifiée).
const getActiveBanners = async () => {
  const today = todayISOInZone()
  const [closure, announcement] = await Promise.all([getKitchenClosure(), getSiteAnnouncement()])
  const banners = []

  if (closure.active && closure.message) {
    banners.push({ kind: 'closure', message: closure.message, from: closure.from, to: closure.to, scope: closure.scope })
  }
  if (isAnnouncementVisible(announcement, today)) {
    banners.push({ kind: 'announcement', message: announcement.message, from: announcement.from, to: announcement.to })
  }

  return banners
}

const getClientState = async () => {
  const tables = await listTables()
  const validIds = new Set(tables.map((table) => table.id))
  const tableZonesById = Object.fromEntries(tables.map((table) => [table.id, table.zone]))
  const tableMerges = await getTableMerges(validIds, tableZonesById)
  const reservations = await listReservations(tables, tableMerges, { statuses: ['pending', 'confirmed'] })
  const adminBlocks = await listAdminBlocks(tables)
  const lunchDisabled = await getLunchDisabled()
  const kitchenClosure = await getKitchenClosure()

  return {
    tables,
    tableLayout: getTableLayoutMap(tables),
    tableMerges,
    reservations,
    adminBlocks,
    lunchDisabled,
    kitchenClosure,
    maxGroupSize: MAX_GROUP_SIZE,
    openingHours: openingHours.getClientPayload({ lunchDisabled })
  }
}

// État exposé aux visiteurs (/reservation) : uniquement ce qu'il faut pour
// griser les créneaux. Jamais de nom, email, téléphone ni note interne.
const getPublicState = async () => {
  const state = await getClientState()

  return {
    ...state,
    reservations: state.reservations.map((reservation) => ({
      id: reservation.id,
      date: reservation.date,
      time: reservation.time,
      tableId: reservation.tableId,
      tableMembers: reservation.tableMembers,
      status: reservation.status,
      noShow: reservation.noShow
    })),
    adminBlocks: state.adminBlocks.map((block) => ({
      id: block.id,
      tableId: block.tableId,
      date: block.date,
      startTime: block.startTime,
      endMinutes: block.endMinutes,
      endTime: block.endTime
    }))
  }
}

const parseMemberIds = (tableMembers, tableId, tablesById) => {
  const fromArray = Array.isArray(tableMembers)
    ? tableMembers
    : String(tableMembers || '')
        .split(',')
        .map((value) => value.trim())

  const fromTableId = (() => {
    const value = String(tableId || '').trim()
    if (!value) return []
    if (value.startsWith('GROUP:')) {
      return value
        .slice(6)
        .split('+')
        .map((id) => id.trim())
    }
    return [value]
  })()

  const merged = Array.from(new Set([...fromArray, ...fromTableId]))
  return merged
    .map((id) => String(id || '').trim())
    .filter((id) => Boolean(tablesById[id]))
    .sort((a, b) => a.localeCompare(b))
}

const hasConflict = ({ members, date, time, reservations, adminBlocks, duration = RESERVATION_DURATION_MIN }) => {
  const targetStart = toMinutes(time)
  const targetEnd = targetStart + duration

  const reservationConflict = reservations.some((reservation) => {
    if (reservation.status === 'cancelled') return false
    if (reservation.noShow) return false
    if (reservation.date !== date) return false
    if (!reservation.tableMembers.some((memberId) => members.includes(memberId))) return false

    const start = toMinutes(reservation.time)
    const end = start + duration
    return overlaps(targetStart, targetEnd, start, end)
  })

  if (reservationConflict) return true

  return adminBlocks.some((block) => {
    if (block.date !== date) return false
    if (!members.includes(block.tableId)) return false

    const start = toMinutes(block.startTime)
    const end = Number.isFinite(Number(block.endMinutes))
      ? Number(block.endMinutes)
      : toMinutes(block.endTime)

    return overlaps(targetStart, targetEnd, start, end)
  })
}

const createReservation = async (payload) => {
  const state = await getClientState()
  const tablesByUiId = Object.fromEntries(state.tables.map((table) => [table.id, table]))

  const name = truncSafe(payload?.name, MAX_NAME_LEN)
  const email = normalizeEmail(payload?.email)
  const phone = normalizePhone(payload?.phone)
  const message = truncSafe(payload?.message, MAX_MESSAGE_LEN)
  const people = Number.parseInt(String(payload?.people || '').trim(), 10)
  const date = normalizeDate(payload?.date)
  const time = normalizeTime(payload?.time)

  if (!name || !email || !phone || message === null || !date || !time || !Number.isInteger(people)) {
    throw createError(400, 'Données de réservation invalides.')
  }

  if (people < 1 || people > MAX_GROUP_SIZE) {
    throw createError(400, `Le nombre de personnes doit être entre 1 et ${MAX_GROUP_SIZE}.`)
  }

  // Barrière serveur sur les horaires : le calendrier client masque déjà les
  // jours fermés, mais l'API doit refuser d'elle-même (dimanche, heure hors
  // service, midi coupé par le réglage admin).
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
  const allowedSlots = openingHours.getSlotsForWeekday(weekday, {
    lunchDisabled: state.lunchDisabled
  })

  if (!allowedSlots.length) {
    throw createError(409, 'Le restaurant est fermé ce jour-là.')
  }

  if (!allowedSlots.includes(time)) {
    throw createError(409, "Ce créneau n'est pas proposé à la réservation.")
  }

  if (isDateWithinClosure(state.kitchenClosure, date)) {
    throw createError(
      409,
      state.kitchenClosure.message || 'Les réservations sont fermées à cette date.'
    )
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Verrou sur toutes les tables actives : l'attribution lit l'occupation
    // puis choisit, les deux doivent être atomiques face aux réservations
    // simultanées.
    await client.query(`SELECT id FROM tables WHERE is_active = true ORDER BY id FOR UPDATE`)

    // Tables déjà prises sur le créneau (réservations non annulées et non
    // absentes, plus les blocages posés par l'admin).
    const busy = await client.query(
      `
        SELECT rt.table_id AS table_id
        FROM reservations r
        JOIN reservation_tables rt ON rt.reservation_id = r.id
        WHERE r.date = $1
          AND r.status <> 'cancelled'
          AND r.no_show IS NOT TRUE
          AND r.time_start < ($2::time + ($3 * interval '1 minute'))
          AND ($2::time) < (r.time_start + ($3 * interval '1 minute'))
        UNION
        -- end_minutes est un absolu depuis minuit (il peut dépasser 1440 pour
        -- un blocage qui franchit minuit), donc comparaison en minutes.
        SELECT b.table_id AS table_id
        FROM admin_blocks b
        WHERE b.date = $1
          AND (EXTRACT(EPOCH FROM b.start_time) / 60) < ((EXTRACT(EPOCH FROM $2::time) / 60) + $3)
          AND (EXTRACT(EPOCH FROM $2::time) / 60) < b.end_minutes
      `,
      [date, time, RESERVATION_DURATION_MIN]
    )

    const busyDbIds = new Set(busy.rows.map((row) => String(row.table_id)))
    const isFree = (uiId) => !busyDbIds.has(String(tablesByUiId[uiId]?.dbId))

    const allocation = allocateTables({ tables: state.tables, people, isFree })
    const members = allocation.members
    const memberDbIds = members
      .map((memberId) => Number(tablesByUiId[memberId]?.dbId))
      .filter((value) => Number.isInteger(value))

    // Aucune table attribuée : la demande reste en attente, l'admin la placera.
    const anchorTableId = memberDbIds.length ? memberDbIds[0] : null

    const insertReservation = await client.query(
      `
        INSERT INTO reservations (
          table_id,
          date,
          time_start,
          covers,
          name,
          email,
          phone,
          message,
          source,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'online', 'pending')
        RETURNING id, created_at
      `,
      [anchorTableId, date, time, people, name, email, phone, message]
    )

    const reservationId = Number(insertReservation.rows[0].id)

    for (const memberDbId of memberDbIds) {
      await client.query(
        `
          INSERT INTO reservation_tables (reservation_id, table_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [reservationId, memberDbId]
      )
    }

    await client.query('COMMIT')

    const mergedGroups = state.tableMerges
    const tableSeats = members.reduce(
      (sum, memberId) => sum + (tablesByUiId[memberId]?.seats || 0),
      0
    )
    // Pour une paire attribuée automatiquement, afficher les vrais codes
    // (« T-2 + T-3 ») plutôt qu'un code de fusion générique, qui serait
    // identique pour toutes les paires non enregistrées.
    const memberCodes = members.map((memberId) => tablesByUiId[memberId]?.code || memberId)
    const knownMergeIndex = mergedGroups.findIndex(
      (group) => group.length === members.length && group.every((id, i) => id === members[i])
    )
    const tableLabel = members.length > 1
      ? (knownMergeIndex >= 0 ? getMergedUnitCode(members, mergedGroups) : memberCodes.join(' + '))
      : memberCodes[0] || ''

    const newReservation = {
      id: String(reservationId),
      name,
      email,
      phone,
      people,
      date,
      time,
      tableId: members.length > 1 ? `GROUP:${members.join('+')}` : members[0] || '',
      tableLabel,
      tableSeats,
      tableMembers: members,
      needsManualTable: members.length === 0,
      allocationReason: allocation.reason,
      message,
      source: 'online',
      status: 'pending',
      createdAt:
        insertReservation.rows[0].created_at instanceof Date
          ? insertReservation.rows[0].created_at.toISOString()
          : new Date().toISOString()
    }

    await sendReservationAcknowledgement(newReservation).catch((error) => {
      console.warn('Ack réservation non envoyé :', error?.message || error)
    })

    await sendManagerNewReservationNotification(newReservation).catch((error) => {
      console.warn('Notif gérant non envoyée :', error?.message || error)
    })

    return newReservation
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

const createQuoteRequest = async (payload) => {
  await ensureInitialized()

  const requestKind = String(payload?.requestKind || '').trim().toLowerCase()
  const firstName = truncSafe(payload?.firstName, MAX_NAME_LEN)
  const lastName = truncSafe(payload?.lastName, MAX_NAME_LEN)
  const email = normalizeEmail(payload?.email)
  const phone = normalizePhone(payload?.phone)
  const message = truncSafe(payload?.message, MAX_MESSAGE_LEN)

  const companyName = truncSafe(payload?.companyName, MAX_COMPANY_LEN)
  const companyContactName = truncSafe(payload?.companyContactName, MAX_NAME_LEN)
  const vatNumber = truncSafe(payload?.vatNumber, MAX_VAT_LEN)
  const peppolId = truncSafe(payload?.peppolId, MAX_VAT_LEN)

  if (!['particulier', 'entreprise'].includes(requestKind)) {
    throw createError(400, 'Type de demande invalide.')
  }

  if (!firstName || !lastName || !email || !phone || !message) {
    throw createError(400, 'Merci de remplir tous les champs obligatoires.')
  }

  if (requestKind === 'entreprise') {
    if (!companyName || !companyContactName || !vatNumber || !peppolId) {
      throw createError(400, 'Champs entreprise incomplets.')
    }
  }

  const fullName = `${firstName} ${lastName}`.trim()
  const requestType = 'privatisation'

  const { rows } = await pool.query(
    `
      INSERT INTO quote_requests (
        type,
        name,
        email,
        phone,
        message,
        request_kind,
        first_name,
        last_name,
        company_name,
        company_contact_name,
        vat_number,
        peppol_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, created_at
    `,
    [
      requestType,
      fullName,
      email,
      phone,
      message,
      requestKind,
      firstName,
      lastName,
      companyName || null,
      companyContactName || null,
      vatNumber || null,
      peppolId || null
    ]
  )

  return {
    id: String(rows?.[0]?.id || ''),
    requestKind,
    firstName,
    lastName,
    email,
    phone,
    message,
    companyName: companyName || '',
    companyContactName: companyContactName || '',
    vatNumber: vatNumber || '',
    peppolId: peppolId || '',
    createdAt:
      rows?.[0]?.created_at instanceof Date
        ? rows[0].created_at.toISOString()
        : new Date().toISOString()
  }
}

// Marque ou démarque une absence. Réversible : `noShow` à false remet la
// réservation en présence, et la table redevient occupée dans les calculs de
// conflit (une absence libère le créneau).
const markNoShow = async (reservationId, noShow = true) => {
  await ensureInitialized()

  const id = Number.parseInt(String(reservationId || '').trim(), 10)
  if (!Number.isInteger(id)) {
    throw createError(400, 'ID de réservation invalide.')
  }

  const value = noShow === true || noShow === 'true' || noShow === 1 || noShow === '1'

  const { rowCount } = await pool.query(
    `UPDATE reservations SET no_show = $2 WHERE id = $1 AND status <> 'cancelled'`,
    [id, value]
  )
  return rowCount > 0
}

// Assigne (ou réassigne) une ou plusieurs tables à une réservation.
// Utilisé par l'admin pour placer les groupes que l'attribution automatique
// n'a pas pu servir.
const assignReservationTables = async (reservationId, tableUiIds) => {
  await ensureInitialized()

  const id = Number.parseInt(String(reservationId || '').trim(), 10)
  if (!Number.isInteger(id)) {
    throw createError(400, 'ID de réservation invalide.')
  }

  const tables = await listTables()
  const tablesByUiId = Object.fromEntries(tables.map((table) => [table.id, table]))

  const requested = Array.isArray(tableUiIds)
    ? tableUiIds
    : String(tableUiIds || '').split(',')

  const members = Array.from(
    new Set(requested.map((value) => String(value || '').trim()).filter((value) => tablesByUiId[value]))
  ).sort()

  if (!members.length) {
    throw createError(400, 'Aucune table valide sélectionnée.')
  }

  const memberDbIds = members.map((memberId) => Number(tablesByUiId[memberId].dbId))

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const current = await client.query(
      `SELECT id, date::text AS date, to_char(time_start, 'HH24:MI') AS time_start, covers, status
       FROM reservations WHERE id = $1 FOR UPDATE`,
      [id]
    )

    if (!current.rows.length) {
      throw createError(404, 'Réservation introuvable.')
    }

    const reservation = current.rows[0]

    if (reservation.status === 'cancelled') {
      throw createError(409, 'Réservation annulée : impossible de lui attribuer une table.')
    }

    const seats = members.reduce((sum, memberId) => sum + (tablesByUiId[memberId].seats || 0), 0)
    if (Number(reservation.covers) > seats) {
      throw createError(400, `Capacité insuffisante : ${seats} places pour ${reservation.covers} couverts.`)
    }

    const conflict = await client.query(
      `
        SELECT r.id FROM reservations r
        JOIN reservation_tables rt ON rt.reservation_id = r.id
        WHERE r.date = $1
          AND r.id <> $2
          AND r.status <> 'cancelled'
          AND r.no_show IS NOT TRUE
          AND rt.table_id = ANY($3::integer[])
          AND r.time_start < ($4::time + ($5 * interval '1 minute'))
          AND ($4::time) < (r.time_start + ($5 * interval '1 minute'))
        LIMIT 1
      `,
      [reservation.date, id, memberDbIds, reservation.time_start, RESERVATION_DURATION_MIN]
    )

    if (conflict.rows.length) {
      throw createError(409, 'Une de ces tables est déjà prise sur ce créneau.')
    }

    await client.query('DELETE FROM reservation_tables WHERE reservation_id = $1', [id])

    for (const memberDbId of memberDbIds) {
      await client.query(
        `INSERT INTO reservation_tables (reservation_id, table_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [id, memberDbId]
      )
    }

    await client.query('UPDATE reservations SET table_id = $2 WHERE id = $1', [id, memberDbIds[0]])
    await client.query('COMMIT')

    return { id: String(id), tableMembers: members, tableSeats: seats }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

const deleteReservation = async (reservationId) => {
  await ensureInitialized()

  const id = Number.parseInt(String(reservationId || '').trim(), 10)
  if (!Number.isInteger(id)) {
    throw createError(400, 'ID de réservation invalide.')
  }

  const { rowCount } = await pool.query('DELETE FROM reservations WHERE id = $1', [id])
  return rowCount > 0
}

const updateReservationStatus = async (reservationId, nextStatus) => {
  await ensureInitialized()

  const id = Number.parseInt(String(reservationId || '').trim(), 10)
  if (!Number.isInteger(id)) {
    throw createError(400, 'ID de réservation invalide.')
  }

  const normalizedStatus = String(nextStatus || '').trim().toLowerCase()
  if (!['pending', 'confirmed', 'cancelled'].includes(normalizedStatus)) {
    throw createError(400, 'Statut invalide.')
  }

  const tables = await listTables()
  const tableByUiId = Object.fromEntries(tables.map((table) => [table.id, table]))
  const dbIdToUiId = Object.fromEntries(tables.map((table) => [String(table.dbId), table.id]))
  const tableZonesById = Object.fromEntries(tables.map((table) => [table.id, table.zone]))
  const tableMerges = await getTableMerges(new Set(tables.map((t) => t.id)), tableZonesById)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `
        UPDATE reservations
        SET status = $2
        WHERE id = $1
        RETURNING
          id,
          table_id,
          date::text AS date,
          to_char(time_start, 'HH24:MI') AS time_start,
          covers,
          name,
          email,
          phone,
          message,
          source,
          status,
          no_show,
          created_at
      `,
      [id, normalizedStatus]
    )

    if (!rows.length) {
      throw createError(404, 'Réservation introuvable.')
    }

    const memberResult = await client.query(
      `SELECT table_id FROM reservation_tables WHERE reservation_id = $1 ORDER BY table_id`,
      [id]
    )

    await client.query('COMMIT')

    const base = rows[0]
    const members = memberResult.rows
      .map((row) => dbIdToUiId[String(row.table_id)])
      .filter(Boolean)
    const fallbackMember = base.table_id ? [dbIdToUiId[String(base.table_id)]].filter(Boolean) : []
    const finalMembers = (members.length ? members : fallbackMember)
      .filter((memberId) => Boolean(tableByUiId[memberId]))
      .sort((a, b) => a.localeCompare(b))

    const seats = finalMembers.reduce((sum, memberId) => sum + (tableByUiId[memberId]?.seats || 0), 0)

    const tableLabel =
      finalMembers.length > 1
        ? getMergedUnitCode(finalMembers, tableMerges)
        : tableByUiId[finalMembers[0] || '']?.code || finalMembers[0] || ''

    const updated = {
      id: String(base.id),
      name: base.name,
      email: base.email || '',
      phone: base.phone || '',
      people: Number(base.covers) || 0,
      date: base.date,
      time: base.time_start,
      tableId:
        finalMembers.length > 1 ? `GROUP:${finalMembers.join('+')}` : finalMembers[0] || String(base.table_id || ''),
      tableLabel,
      tableSeats: seats,
      tableMembers: finalMembers,
      message: base.message || '',
      source: base.source || 'online',
      status: base.status || normalizedStatus,
      noShow: base.no_show || false,
      createdAt: base.created_at instanceof Date ? base.created_at.toISOString() : String(base.created_at || '')
    }

    if (['confirmed', 'cancelled'].includes(normalizedStatus)) {
      await sendReservationStatusEmail(updated, normalizedStatus).catch((error) => {
        console.warn('Email statut réservation non envoyé :', error?.message || error)
      })
    }

    return updated
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

// Comparaison tolérante des identités saisies par le client pour annuler.
const normalizeNameForMatch = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

// Compare les 9 derniers chiffres : « 0470 12 34 56 » = « +32 470 12 34 56 ».
const phoneDigitsForMatch = (value) => String(value || '').replace(/\D/g, '').slice(-9)

const nowTimeInZone = () => {
  try {
    return new Date().toLocaleTimeString('en-GB', {
      timeZone: REPORT_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return new Date().toISOString().slice(11, 16)
  }
}

// Annulation par le client depuis le site. Les trois champs (nom, email,
// téléphone) doivent correspondre. Seules les réservations à venir, pas encore
// commencées, sont annulées. Renvoie les réservations annulées (vide si rien).
const cancelReservationByClient = async (payload) => {
  await ensureInitialized()

  const name = truncSafe(payload?.name, MAX_NAME_LEN)
  const email = normalizeEmail(payload?.email)
  const phone = normalizePhone(payload?.phone)

  if (!name || !email || !phone || email.length > MAX_EMAIL_LEN) {
    throw createError(400, 'Merci de renseigner ton nom, ton email et ton téléphone.')
  }

  const today = todayISOInZone()
  const nowTime = nowTimeInZone()
  const wantedName = normalizeNameForMatch(name)
  const wantedPhone = phoneDigitsForMatch(phone)

  const { rows } = await pool.query(
    `
      SELECT id, name, phone, date::text AS date, to_char(time_start, 'HH24:MI') AS time_start
      FROM reservations
      WHERE lower(email) = $1
        AND status IN ('pending', 'confirmed')
        AND date >= $2::date
    `,
    [email, today]
  )

  const ids = rows
    .filter((row) => normalizeNameForMatch(row.name) === wantedName)
    .filter((row) => wantedPhone.length >= 6 && phoneDigitsForMatch(row.phone) === wantedPhone)
    .filter((row) => row.date > today || row.time_start > nowTime)
    .map((row) => row.id)

  if (!ids.length) return []

  const { rows: cancelled } = await pool.query(
    `
      UPDATE reservations
      SET status = 'cancelled'
      WHERE id = ANY($1::int[])
        AND status IN ('pending', 'confirmed')
      RETURNING id, name, email, phone, covers, message,
        date::text AS date, to_char(time_start, 'HH24:MI') AS time_start
    `,
    [ids]
  )

  const result = cancelled.map((row) => ({
    id: String(row.id),
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    people: Number(row.covers) || 0,
    date: row.date,
    time: row.time_start,
    message: row.message || ''
  }))

  for (const reservation of result) {
    await sendClientCancellationEmail(reservation).catch((error) => {
      console.warn('Email annulation client non envoyé :', error?.message || error)
    })
    await sendManagerClientCancellationNotification(reservation).catch((error) => {
      console.warn('Notif annulation gérant non envoyée :', error?.message || error)
    })
  }

  return result
}

const updateTableLayout = async (layout) => {
  await ensureInitialized()

  const tables = await listTables()
  const tablesByUiId = Object.fromEntries(tables.map((table) => [table.id, table]))
  const nextLayout = layout && typeof layout === 'object' ? layout : {}

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    for (const [tableId, plan] of Object.entries(nextLayout)) {
      if (!tablesByUiId[tableId]) continue
      if (!plan || typeof plan !== 'object') continue

      const rawX = Number(plan.x)
      const rawY = Number(plan.y)
      if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) continue

      const x = clamp(rawX, 3, 97)
      const y = clamp(rawY, 3, 97)

      const dbId = Number(tablesByUiId[tableId].dbId)
      if (!Number.isInteger(dbId)) continue
      await client.query('UPDATE tables SET pos_x = $1, pos_y = $2 WHERE id = $3', [x, y, dbId])
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }

  const refreshedTables = await listTables()
  return getTableLayoutMap(refreshedTables)
}

const updateTableMerges = async (groups) => {
  const tables = await listTables()
  const validIds = new Set(tables.map((table) => table.id))
  const tableZonesById = Object.fromEntries(tables.map((table) => [table.id, table.zone]))
  return setTableMerges(groups, validIds, tableZonesById)
}

const replaceAdminBlocks = async (blocks) => {
  await ensureInitialized()

  const tables = await listTables()
  const tablesByUiId = Object.fromEntries(tables.map((table) => [table.id, table]))
  const source = Array.isArray(blocks) ? blocks : []

  const normalized = source
    .map((item, index) => {
      const tableId = String(item?.tableId || '').trim()
      if (!tablesByUiId[tableId]) return null

      const date = normalizeDate(item?.date)
      const startTime = normalizeTime(item?.startTime)
      if (!date || !startTime) return null

      const startMinutes = toMinutes(startTime)
      const rawEndMinutes = Number(item?.endMinutes)
      const fallbackEnd = normalizeTime(item?.endTime)
      let endMinutes = Number.isFinite(rawEndMinutes) ? rawEndMinutes : toMinutes(fallbackEnd)

      if (!Number.isFinite(endMinutes) || endMinutes <= 0) {
        endMinutes = startMinutes + RESERVATION_DURATION_MIN
      }

      if (endMinutes <= startMinutes) {
        endMinutes += 1440
      }

      const id = String(item?.id || `blk_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`)

      return {
        id,
        tableId,
        date,
        startTime,
        endMinutes,
        reason: String(item?.reason || 'Arrivée sans réservation'),
        createdAt: item?.createdAt ? new Date(item.createdAt) : new Date()
      }
    })
    .filter(Boolean)

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM admin_blocks')

    for (const block of normalized) {
      await client.query(
        `
          INSERT INTO admin_blocks (
            id,
            table_id,
            date,
            start_time,
            end_minutes,
            reason,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          block.id,
          Number(tablesByUiId[block.tableId].dbId),
          block.date,
          block.startTime,
          block.endMinutes,
          block.reason,
          block.createdAt
        ]
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }

  return listAdminBlocks(tables)
}

module.exports = {
  assignReservationTables,
  cancelReservationByClient,
  listTables,
  captureReservationStats,
  createQuoteRequest,
  createReservation,
  deleteReservation,
  getActiveBanners,
  getClientState,
  getPublicState,
  getKitchenClosure,
  getLunchDisabled,
  getSiteAnnouncement,
  markNoShow,
  purgeOldReservations,
  replaceAdminBlocks,
  serializeStateForScript,
  setKitchenClosure,
  setLunchDisabled,
  setSiteAnnouncement,
  updateReservationStatus,
  updateTableLayout,
  updateTableMerges
}
