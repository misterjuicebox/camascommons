// Storage for click and page-view analytics, in a D1 database bound to the Pages
// project as ANALYTICS (Cloudflare dashboard → Workers & Pages → camascommons →
// Settings → Bindings → D1 database, variable name ANALYTICS; add it to both
// Production and Preview). Tables are created on first use.
//
// Privacy: no IP addresses or user agents are stored. To count people as well as
// clicks, each visitor gets a one-way code that changes every day, kept for 2 days.

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS daily_events (
     day TEXT NOT NULL,
     kind TEXT NOT NULL,
     target TEXT NOT NULL,
     label TEXT,
     section TEXT,
     href TEXT,
     count INTEGER NOT NULL DEFAULT 0,
     uniques INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (day, kind, target)
   )`,
  `CREATE TABLE IF NOT EXISTS daily_visitors (
     day TEXT NOT NULL,
     kind TEXT NOT NULL,
     target TEXT NOT NULL,
     visitor TEXT NOT NULL,
     PRIMARY KEY (day, kind, target, visitor)
   )`,
];

let schemaReady = false;

export async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  schemaReady = true;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

export async function visitorCode(request, day) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ua = request.headers.get('User-Agent') || '';
  const bytes = new TextEncoder().encode(`${day}|${ip}|${ua}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].slice(0, 10).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function recordEvent(db, request, event) {
  await ensureSchema(db);
  const day = today();
  const visitor = await visitorCode(request, day);

  const seen = await db
    .prepare('INSERT OR IGNORE INTO daily_visitors (day, kind, target, visitor) VALUES (?, ?, ?, ?)')
    .bind(day, event.kind, event.target, visitor)
    .run();
  const isNewVisitor = seen.meta && seen.meta.changes > 0 ? 1 : 0;

  await db
    .prepare(
      `INSERT INTO daily_events (day, kind, target, label, section, href, count, uniques)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT (day, kind, target) DO UPDATE SET
         count = count + 1,
         uniques = uniques + excluded.uniques,
         label = excluded.label,
         section = excluded.section,
         href = excluded.href`
    )
    .bind(day, event.kind, event.target, event.label, event.section, event.href, isNewVisitor)
    .run();

  // Now and then, drop visitor codes older than yesterday
  if (Math.random() < 0.02) {
    await db.prepare('DELETE FROM daily_visitors WHERE day < ?').bind(daysAgo(1)).run();
  }
}
