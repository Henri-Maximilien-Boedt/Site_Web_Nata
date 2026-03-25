const pool = require('../db')

const SETTINGS_KEYS = {
  tableMerges: 'table_merges_v1',
  terraceLayoutVersion: 'terrace_layout_version_v1',
  interiorLayoutVersion: 'interior_layout_version_v1'
}

const TERRACE_LAYOUT_VERSION_TARGET = '3'
const INTERIOR_LAYOUT_VERSION_TARGET = '3'

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
  { id: 'TR6-1', code: 'T-21', seats: 6, zone: 'terrasse', x: 54, y: 76 }
]

const DEFAULT_TABLE_BY_CODE = Object.fromEntries(DEFAULT_TABLES.map((table) => [table.code, table]))

let initPromise = null

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const TABLE_SIZE_SCALE = 0.7
const BASE_RECT_TABLE_WIDTH = 11 * TABLE_SIZE_SCALE
const BASE_RECT_TABLE_HEIGHT = clamp((8 + 2 * 1.6) * TABLE_SIZE_SCALE, 12 * TABLE_SIZE_SCALE, 30 * TABLE_SIZE_SCALE)
const WIDE_INTERIOR_TABLE_CODES = new Set(['T-23', 'T-27'])
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
  if (!email || !email.includes('@')) return null
  return email
}

const normalizePhone = (value) => {
  const phone = String(value || '').trim()
  return phone || null
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

const serializeStateForScript = (state) => JSON.stringify(state).replace(/</g, '\\u003c')

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
    `
      INSERT INTO settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO NOTHING
    `,
    [SETTINGS_KEYS.tableMerges, '[]']
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

const listReservations = async (tables, tableMerges) => {
  await ensureInitialized()

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
      r.created_at,
      COALESCE(
        array_agg(rt.table_id ORDER BY rt.table_id)
        FILTER (WHERE rt.table_id IS NOT NULL),
        ARRAY[]::integer[]
      ) AS member_ids
    FROM reservations r
    LEFT JOIN reservation_tables rt
      ON rt.reservation_id = r.id
    WHERE r.status = 'confirmed'
    GROUP BY r.id
    ORDER BY r.date DESC, r.time_start ASC, r.id DESC
  `)

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

const getClientState = async () => {
  const tables = await listTables()
  const validIds = new Set(tables.map((table) => table.id))
  const tableZonesById = Object.fromEntries(tables.map((table) => [table.id, table.zone]))
  const tableMerges = await getTableMerges(validIds, tableZonesById)
  const reservations = await listReservations(tables, tableMerges)
  const adminBlocks = await listAdminBlocks(tables)

  return {
    tables,
    tableLayout: getTableLayoutMap(tables),
    tableMerges,
    reservations,
    adminBlocks
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

const hasConflict = ({ members, date, time, reservations, adminBlocks }) => {
  const targetStart = toMinutes(time)
  const targetEnd = targetStart + 120

  const reservationConflict = reservations.some((reservation) => {
    if (reservation.date !== date) return false
    if (!reservation.tableMembers.some((memberId) => members.includes(memberId))) return false

    const start = toMinutes(reservation.time)
    const end = start + 120
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

  const name = String(payload?.name || '').trim()
  const email = String(payload?.email || '').trim()
  const phone = String(payload?.phone || '').trim()
  const message = String(payload?.message || '').trim()
  const people = Number.parseInt(String(payload?.people || '').trim(), 10)
  const date = normalizeDate(payload?.date)
  const time = normalizeTime(payload?.time)

  if (!name || !email || !phone || !date || !time || !Number.isInteger(people)) {
    throw createError(400, 'Données de réservation invalides.')
  }

  if (people < 1 || people > 10) {
    throw createError(400, 'Le nombre de personnes doit être entre 1 et 10.')
  }

  const members = parseMemberIds(payload?.tableMembers, payload?.tableId, tablesByUiId)
  if (!members.length) {
    throw createError(400, 'Table invalide.')
  }

  const tableSeats = members.reduce((sum, memberId) => sum + (tablesByUiId[memberId]?.seats || 0), 0)
  if (people > tableSeats) {
    throw createError(400, 'Cette table est trop petite pour ce groupe.')
  }

  if (hasConflict({
    members,
    date,
    time,
    reservations: state.reservations,
    adminBlocks: state.adminBlocks
  })) {
    throw createError(409, 'Cette table n\'est plus disponible sur ce créneau.')
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const memberDbIds = members
      .map((memberId) => Number(tablesByUiId[memberId]?.dbId))
      .filter((value) => Number.isInteger(value))

    if (!memberDbIds.length) {
      throw createError(400, 'Table invalide.')
    }

    const anchorTableId = memberDbIds[0]

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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'online', 'confirmed')
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
    const tableLabel =
      members.length > 1
        ? getMergedUnitCode(members, mergedGroups)
        : tablesByUiId[members[0]]?.code || members[0]

    return {
      id: String(reservationId),
      name,
      email,
      phone,
      people,
      date,
      time,
      tableId: members.length > 1 ? `GROUP:${members.join('+')}` : members[0],
      tableLabel,
      tableSeats,
      tableMembers: members,
      message,
      source: 'online',
      status: 'confirmed',
      createdAt:
        insertReservation.rows[0].created_at instanceof Date
          ? insertReservation.rows[0].created_at.toISOString()
          : new Date().toISOString()
    }
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
  const firstName = String(payload?.firstName || '').trim()
  const lastName = String(payload?.lastName || '').trim()
  const email = normalizeEmail(payload?.email)
  const phone = normalizePhone(payload?.phone)
  const message = String(payload?.message || '').trim()

  const companyName = String(payload?.companyName || '').trim()
  const companyContactName = String(payload?.companyContactName || '').trim()
  const vatNumber = String(payload?.vatNumber || '').trim()
  const peppolId = String(payload?.peppolId || '').trim()

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

const deleteReservation = async (reservationId) => {
  await ensureInitialized()

  const id = Number.parseInt(String(reservationId || '').trim(), 10)
  if (!Number.isInteger(id)) {
    throw createError(400, 'ID de réservation invalide.')
  }

  const { rowCount } = await pool.query('DELETE FROM reservations WHERE id = $1', [id])
  return rowCount > 0
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
        endMinutes = startMinutes + 120
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
  createQuoteRequest,
  createReservation,
  deleteReservation,
  getClientState,
  replaceAdminBlocks,
  serializeStateForScript,
  updateTableLayout,
  updateTableMerges
}
