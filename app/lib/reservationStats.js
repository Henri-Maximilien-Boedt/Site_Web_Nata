// Statistiques de réservation, lues dans la table d'agrégats journaliers
// alimentée par restaurantStore.captureReservationStats().
//
// La table reservations ne conserve qu'un jour d'historique : toute analyse
// au-delà de la semaine passe obligatoirement par reservation_stats_daily.

const pool = require('../db')

const REPORT_TIME_ZONE = process.env.APP_TIMEZONE || 'Europe/Brussels'

const MEASURES = `
  COALESCE(SUM(s.reservations), 0)::int  AS reservations,
  COALESCE(SUM(s.confirmed), 0)::int     AS confirmed,
  COALESCE(SUM(s.covers), 0)::int        AS covers,
  COALESCE(SUM(s.no_shows), 0)::int      AS no_shows,
  COALESCE(SUM(s.cancelled), 0)::int     AS cancelled,
  COALESCE(SUM(s.online_count), 0)::int  AS online_count,
  COALESCE(SUM(s.phone_count), 0)::int   AS phone_count,
  COALESCE(SUM(s.reservations) FILTER (WHERE s.service = 'lunch'), 0)::int   AS lunch,
  COALESCE(SUM(s.reservations) FILTER (WHERE s.service = 'evening'), 0)::int AS evening
`

const EMPTY = {
  reservations: 0,
  confirmed: 0,
  covers: 0,
  noShows: 0,
  cancelled: 0,
  onlineCount: 0,
  phoneCount: 0,
  lunch: 0,
  evening: 0
}

const toMetrics = (row) => {
  if (!row) return { ...EMPTY, noShowRate: 0, averageCovers: 0 }

  const reservations = Number(row.reservations) || 0
  const covers = Number(row.covers) || 0
  const noShows = Number(row.no_shows) || 0

  return {
    reservations,
    confirmed: Number(row.confirmed) || 0,
    covers,
    noShows,
    cancelled: Number(row.cancelled) || 0,
    onlineCount: Number(row.online_count) || 0,
    phoneCount: Number(row.phone_count) || 0,
    lunch: Number(row.lunch) || 0,
    evening: Number(row.evening) || 0,
    // Part des absences parmi les réservations, en pourcentage.
    noShowRate: reservations ? Math.round((noShows / reservations) * 1000) / 10 : 0,
    // Couverts moyens par réservation.
    averageCovers: reservations ? Math.round((covers / reservations) * 10) / 10 : 0
  }
}

// Variation en pourcentage entre deux périodes. null quand la précédente est
// vide : afficher « +100 % » à partir de zéro n'aurait pas de sens.
const variation = (current, previous) => {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

// Totaux d'une fenêtre glissante, comparés à la fenêtre précédente.
const getWindowTotals = async (days) => {
  const { rows } = await pool.query(
    `
      WITH report_today AS (
        SELECT (now() AT TIME ZONE $1)::date AS current_day
      )
      SELECT
        CASE WHEN s.stat_date >= r.current_day - ($2::int - 1) THEN 'current' ELSE 'previous' END AS bucket,
        ${MEASURES}
      FROM reservation_stats_daily s
      CROSS JOIN report_today r
      WHERE s.stat_date >= r.current_day - ($2::int * 2 - 1)
        AND s.stat_date <= r.current_day
      GROUP BY 1
    `,
    [REPORT_TIME_ZONE, days]
  )

  const byBucket = Object.fromEntries(rows.map((row) => [row.bucket, row]))
  const current = toMetrics(byBucket.current)
  const previous = toMetrics(byBucket.previous)

  return {
    days,
    current,
    previous,
    change: {
      reservations: variation(current.reservations, previous.reservations),
      covers: variation(current.covers, previous.covers),
      noShows: variation(current.noShows, previous.noShows)
    }
  }
}

// Séries temporelles : semaine, mois ou année.
const getSeries = async (unit, limit) => {
  const { rows } = await pool.query(
    `
      SELECT
        date_trunc($1, s.stat_date)::date AS period_start,
        ${MEASURES}
      FROM reservation_stats_daily s
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT $2
    `,
    [unit, limit]
  )

  return rows
    .map((row) => ({
      periodStart: toLocalISODate(row.period_start),
      ...toMetrics(row)
    }))
    .reverse()
}

// Le pilote pg renvoie une colonne DATE comme un Date à minuit LOCAL.
// toISOString() la décalerait d'un jour (et l'année du 1er janvier), donc on
// lit les composantes locales.
const toLocalISODate = (value) => {
  if (!(value instanceof Date)) return String(value).slice(0, 10)
  const pad = (n) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

const formatWeekLabel = (iso) => {
  const date = new Date(`${iso}T00:00:00Z`)
  const end = new Date(date.getTime() + 6 * 24 * 60 * 60 * 1000)
  const day = (value) => String(value.getUTCDate()).padStart(2, '0')
  const month = (value) => String(value.getUTCMonth() + 1).padStart(2, '0')
  return `${day(date)}/${month(date)} – ${day(end)}/${month(end)}`
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
]

const formatMonthLabel = (iso) => {
  const [year, month] = iso.split('-')
  return `${MONTHS_FR[Number(month) - 1]} ${year}`
}

const getReservationStats = async () => {
  const [week, month, byWeek, byMonth, byYear] = await Promise.all([
    getWindowTotals(7),
    getWindowTotals(30),
    getSeries('week', 12),
    getSeries('month', 12),
    getSeries('year', 5)
  ])

  return {
    week,
    month,
    byWeek: byWeek.map((row) => ({ ...row, label: formatWeekLabel(row.periodStart) })),
    byMonth: byMonth.map((row) => ({ ...row, label: formatMonthLabel(row.periodStart) })),
    byYear: byYear.map((row) => ({ ...row, label: row.periodStart.slice(0, 4) })),
    hasData: byMonth.some((row) => row.reservations > 0)
  }
}

module.exports = {
  getReservationStats
}
