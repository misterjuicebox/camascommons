// GET /api/analytics?days=7 — page views and clicks for the admin portal.
// Only signed-in CMS editors (repo collaborators) can read it.
import { verifyEditor } from '../../lib/editor-auth.js';
import { ensureSchema, daysAgo } from '../../lib/analytics-db.js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet({ request, env }) {
  const auth = await verifyEditor(request);
  if (!auth.ok) return json({ success: false, error: auth.error }, auth.status);

  if (!env.ANALYTICS) {
    return json({ success: false, setupNeeded: true, error: 'Click tracking is not connected yet.' }, 503);
  }

  const requested = Number(new URL(request.url).searchParams.get('days')) || 7;
  const days = [1, 7, 30, 90, 365].includes(requested) ? requested : 7;
  const since = daysAgo(days - 1);
  const db = env.ANALYTICS;
  await ensureSchema(db);

  const [views, clicks, daily, firstDay] = await db.batch([
    db.prepare(
      `SELECT target, MAX(label) AS label, SUM(count) AS count, SUM(uniques) AS uniques
       FROM daily_events WHERE kind = 'view' AND day >= ? GROUP BY target ORDER BY count DESC`
    ).bind(since),
    db.prepare(
      `SELECT target, MAX(label) AS label, MAX(section) AS section, MAX(href) AS href,
              SUM(count) AS count, SUM(uniques) AS uniques
       FROM daily_events WHERE kind = 'click' AND day >= ? GROUP BY target ORDER BY count DESC LIMIT 200`
    ).bind(since),
    db.prepare(
      `SELECT day, SUM(CASE WHEN kind = 'view' THEN count ELSE 0 END) AS views,
              SUM(CASE WHEN kind = 'view' THEN uniques ELSE 0 END) AS visitors,
              SUM(CASE WHEN kind = 'click' THEN count ELSE 0 END) AS clicks
       FROM daily_events WHERE day >= ? GROUP BY day ORDER BY day`
    ).bind(since),
    db.prepare('SELECT MIN(day) AS day FROM daily_events'),
  ]);

  const sum = (rows, key) => rows.reduce((total, row) => total + (row[key] || 0), 0);

  return json({
    success: true,
    days,
    since,
    trackingSince: firstDay.results[0]?.day || null,
    totals: {
      views: sum(daily.results, 'views'),
      visitors: sum(daily.results, 'visitors'),
      clicks: sum(daily.results, 'clicks'),
    },
    daily: daily.results,
    pages: views.results,
    clicks: clicks.results,
  });
}
