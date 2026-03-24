const pool = require('../db')

const REPORT_TIME_ZONE = process.env.APP_TIMEZONE || 'Europe/Brussels'

const TRACKED_PAGES = [
  { key: '/', label: 'Accueil', match: (pathname) => pathname === '/' },
  { key: '/menu', label: 'Menu', match: (pathname) => pathname === '/menu' },
  { key: '/evenements', label: 'Événements', match: (pathname) => pathname === '/evenements' },
  { key: '/actualites', label: 'Actualités', match: (pathname) => pathname === '/actualites' },
  { key: '/actualites/:id', label: 'Détail actualité', match: (pathname) => /^\/actualites\/\d+$/.test(pathname) },
  { key: '/reservation', label: 'Réservation', match: (pathname) => pathname === '/reservation' }
]

const BOT_USER_AGENT_RE = /bot|crawl|crawler|spider|slurp|facebookexternalhit|whatsapp|linkedinbot|discordbot|telegrambot|skypeuripreview|headlesschrome|lighthouse|pingdom|uptime|monitor/i

let ensureSchemaPromise = null

const ensureAnalyticsSchema = async () => {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = (async () => {
      const client = await pool.connect()
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS analytics_pageviews_daily (
            view_date date NOT NULL,
            page_key text NOT NULL,
            page_label text NOT NULL,
            view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            PRIMARY KEY (view_date, page_key)
          )
        `)

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_daily_page_key
          ON analytics_pageviews_daily(page_key)
        `)
      } finally {
        client.release()
      }
    })().catch((error) => {
      ensureSchemaPromise = null
      throw error
    })
  }

  return ensureSchemaPromise
}

const resolveTrackedPage = (pathname) => {
  const normalizedPath = String(pathname || '').trim() || '/'
  return TRACKED_PAGES.find((page) => page.match(normalizedPath)) || null
}

const purgeOldPageViews = async () => {
  await pool.query(
    `
      DELETE FROM analytics_pageviews_daily
      WHERE view_date < ((now() AT TIME ZONE $1)::date - 29)
    `,
    [REPORT_TIME_ZONE]
  )
}

const shouldTrackRequest = (req) => {
  if (req.method !== 'GET') return null
  if (!req.accepts('html')) return null

  const trackedPage = resolveTrackedPage(req.path)
  if (!trackedPage) return null

  const userAgent = String(req.get('user-agent') || '')
  if (BOT_USER_AGENT_RE.test(userAgent)) return null

  return trackedPage
}

const recordPageView = async (trackedPage) => {
  await ensureAnalyticsSchema()
  await purgeOldPageViews()

  await pool.query(
    `
      INSERT INTO analytics_pageviews_daily (view_date, page_key, page_label, view_count, updated_at)
      VALUES ((now() AT TIME ZONE $1)::date, $2, $3, 1, now())
      ON CONFLICT (view_date, page_key)
      DO UPDATE
      SET view_count = analytics_pageviews_daily.view_count + 1,
          page_label = EXCLUDED.page_label,
          updated_at = now()
    `,
    [REPORT_TIME_ZONE, trackedPage.key, trackedPage.label]
  )
}

const pageAnalyticsMiddleware = (req, res, next) => {
  const trackedPage = shouldTrackRequest(req)
  if (!trackedPage) return next()

  res.once('finish', () => {
    if (res.statusCode >= 400) return

    const contentType = res.getHeader('content-type')
    const serializedContentType = Array.isArray(contentType) ? contentType.join(';') : String(contentType || '')
    if (serializedContentType && !serializedContentType.includes('text/html')) return

    recordPageView(trackedPage).catch((error) => {
      console.error('Erreur analytics pageviews:', error)
    })
  })

  next()
}

const getPageViewStats = async () => {
  await ensureAnalyticsSchema()
  await purgeOldPageViews()

  const { rows: summaryRows } = await pool.query(
    `
      WITH report_today AS (
        SELECT (now() AT TIME ZONE $1)::date AS current_day
      )
      SELECT
        COALESCE(SUM(CASE WHEN a.view_date = r.current_day THEN a.view_count ELSE 0 END), 0)::int AS today_views,
        COALESCE(SUM(CASE WHEN a.view_date >= r.current_day - 6 THEN a.view_count ELSE 0 END), 0)::int AS last_7_days_views,
        COALESCE(SUM(CASE WHEN a.view_date >= r.current_day - 29 THEN a.view_count ELSE 0 END), 0)::int AS last_30_days_views
      FROM analytics_pageviews_daily a
      CROSS JOIN report_today r
    `,
    [REPORT_TIME_ZONE]
  )

  const { rows: pageRows } = await pool.query(
    `
      WITH report_today AS (
        SELECT (now() AT TIME ZONE $1)::date AS current_day
      )
      SELECT
        a.page_key,
        a.page_label,
        COALESCE(SUM(CASE WHEN a.view_date = r.current_day THEN a.view_count ELSE 0 END), 0)::int AS today_views,
        COALESCE(SUM(CASE WHEN a.view_date >= r.current_day - 6 THEN a.view_count ELSE 0 END), 0)::int AS last_7_days_views,
        COALESCE(SUM(CASE WHEN a.view_date >= r.current_day - 29 THEN a.view_count ELSE 0 END), 0)::int AS last_30_days_views
      FROM analytics_pageviews_daily a
      CROSS JOIN report_today r
      GROUP BY a.page_key, a.page_label
    `,
    [REPORT_TIME_ZONE]
  )

  const rowsByKey = new Map(pageRows.map((row) => [row.page_key, row]))
  const pages = TRACKED_PAGES.map((page) => {
    const row = rowsByKey.get(page.key)
    return {
      pageKey: page.key,
      pageLabel: page.label,
      todayViews: row ? row.today_views : 0,
      last7DaysViews: row ? row.last_7_days_views : 0,
      last30DaysViews: row ? row.last_30_days_views : 0
    }
  })

  return {
    totals: summaryRows[0] || {
      today_views: 0,
      last_7_days_views: 0,
      last_30_days_views: 0
    },
    pages
  }
}

module.exports = {
  getPageViewStats,
  pageAnalyticsMiddleware
}
