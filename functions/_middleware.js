// Runs only for the paths in public/_routes.json (pages, robots.txt and /api), on
// every host. Anything other than camascommons.org (dev.camascommons.org, *.pages.dev
// previews) is:
//   1. password protected (browser login prompt; any username), and
//   2. kept out of search engines (X-Robots-Tag header and a "stay away" robots.txt).
// The live site is untouched.
//
// The password itself is never in this public repo, only its SHA-256 hash. To change
// it, set a DEV_PASSWORD secret on the Pages project (Cloudflare → camascommons →
// Settings → Variables and Secrets, Preview environment); that overrides the hash.
const LIVE_HOSTS = new Set(['camascommons.org', 'www.camascommons.org']);
const DEV_PASSWORD_SHA256 = '3e999c063e5ac7f5956d81e41c5fc985ddbad692f2db99c44e2c861d01d8bbc2';

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function passwordOk(request, env) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded = '';
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const password = decoded.slice(decoded.indexOf(':') + 1);
  if (env.DEV_PASSWORD) return password === env.DEV_PASSWORD;
  return (await sha256Hex(password)) === DEV_PASSWORD_SHA256;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (LIVE_HOSTS.has(url.hostname)) return next();

  if (url.pathname === '/robots.txt') {
    return new Response('# Preview site: not for search engines\nUser-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }

  if (!(await passwordOk(request, env))) {
    return new Response('This is the Camas Commons test site. The live site is https://camascommons.org\n', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Camas Commons dev site", charset="UTF-8"',
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const response = await next();
  const tagged = new Response(response.body, response);
  tagged.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return tagged;
}
