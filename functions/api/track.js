// POST /api/track — records a page view or a click from the homepage script.
// Body (JSON): { kind: 'view' | 'click', target, label, section, href, via }
// via: the ambassador code from a ?via=name link, if the visitor arrived through one
import { recordEvent } from '../../lib/analytics-db.js';

const ALLOWED_HOSTS = ['camascommons.org', 'www.camascommons.org', 'dev.camascommons.org', 'localhost', '127.0.0.1'];
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime/i;

function clean(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function fromAllowedSite(request) {
  const origin = request.headers.get('Origin') || request.headers.get('Referer');
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return ALLOWED_HOSTS.includes(host) || host.endsWith('.camascommons.pages.dev');
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  // 204 for anything we ignore, so the page never sees an error
  const ignore = () => new Response(null, { status: 204 });

  if (!env.ANALYTICS) return new Response(null, { status: 503 });
  if (!fromAllowedSite(request)) return ignore();
  if (BOT_UA.test(request.headers.get('User-Agent') || '')) return ignore();

  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return ignore();
  }

  const kind = body.kind === 'view' ? 'view' : body.kind === 'click' ? 'click' : null;
  const target = clean(body.target, 200);
  if (!kind || !target) return ignore();

  await recordEvent(env.ANALYTICS, request, {
    kind,
    target,
    label: clean(body.label, 120),
    section: clean(body.section, 120),
    href: clean(body.href, 300),
    via: clean(body.via, 40).toLowerCase().replace(/[^a-z0-9._-]/g, ''),
  });
  return ignore();
}
