// Runs only for the paths in public/_routes.json (pages, robots.txt, /api and the dev
// login), on every host. Anything other than camascommons.org (dev.camascommons.org,
// *.pages.dev previews) is:
//   1. behind a password: a login page, then a cookie that keeps the browser signed in
//      for a year (password managers can save it too), and
//   2. kept out of search engines (X-Robots-Tag header and a "stay away" robots.txt).
// The live site is untouched.
//
// The password is never in this public repo. To set or change it, run
//   npm run set-dev-password
// which asks for it with hidden typing and rewrites the three values below: a salt, a
// slow salted hash (PBKDF2) of the password, and a check for the sign-in cookie.
const LIVE_HOSTS = new Set(['camascommons.org', 'www.camascommons.org']);
const DEV_PASSWORD_SALT = 'bbb1d2ad3a8f7ae03694333e328a00d0';
const DEV_PASSWORD_PBKDF2 = '37e74fe03578f267f07120685c37fd1b5e6bb59be0cdb9564994fff4ba1a60bf';
const DEV_COOKIE_CHECK = '9805ff96b70540522af973a98727006a5714b16641645f424c11f69fccef1a64';
const PBKDF2_ITERATIONS = 10000;
const COOKIE_NAME = 'camas_dev';
const LOGIN_PATH = '/__dev-login';

const hex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (text) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

async function pbkdf2(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return hex(bits);
}

// The cookie holds a value derived from the password; the repo only holds its hash
const cookieValueFor = (password) => sha256(`cookie:${DEV_PASSWORD_SALT}:${password}`);

async function passwordOk(password, env) {
  if (!password) return false;
  if (env.DEV_PASSWORD) return password === env.DEV_PASSWORD;
  return (await pbkdf2(password, DEV_PASSWORD_SALT)) === DEV_PASSWORD_PBKDF2;
}

async function cookieOk(request, env) {
  const match = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([a-f0-9]{64})`));
  if (!match) return false;
  const expected = env.DEV_PASSWORD ? await sha256(await cookieValueFor(env.DEV_PASSWORD)) : DEV_COOKIE_CHECK;
  return (await sha256(match[1])) === expected;
}

function safeNext(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function loginPage(next, failed) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Camas Commons test site</title>
<style>
  :root { --bg: #FAF6F0; --card: #FFFDF9; --ink: #1C2A20; --muted: #566459; --line: #E6DCCE; --green: #24472F; --rose: #C5746D; color-scheme: light; }
  @media (prefers-color-scheme: dark) { :root { --bg: #151A16; --card: #1F2621; --ink: #ECE7DD; --muted: #B4BDB5; --line: #323C34; --green: #A3C9AC; color-scheme: dark; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; background: var(--bg); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  form { width: 100%; max-width: 360px; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 1.75rem; display: grid; gap: 0.85rem; }
  h1 { margin: 0; font-family: Georgia, serif; font-size: 1.5rem; color: var(--green); }
  p { margin: 0; color: var(--muted); font-size: 0.95rem; line-height: 1.5; }
  label { font-weight: 600; font-size: 0.9rem; }
  input[type=password] { width: 100%; font: inherit; padding: 0.65rem 0.75rem; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--ink); }
  button { font: inherit; font-weight: 600; padding: 0.7rem; border: 0; border-radius: 8px; background: var(--rose); color: #fff; cursor: pointer; }
  .error { color: var(--rose); font-weight: 600; }
  .hidden { position: absolute; left: -9999px; }
  a { color: var(--rose); }
</style>
</head>
<body>
<form method="post" action="${LOGIN_PATH}">
  <h1>Camas Commons test site</h1>
  <p>Enter the password to view the test site.</p>
  ${failed ? '<p class="error" role="alert">That password didn’t work. Try again.</p>' : ''}
  <input class="hidden" type="text" name="username" value="camas-dev" autocomplete="username" tabindex="-1" aria-hidden="true">
  <label for="password">Password</label>
  <input id="password" type="password" name="password" autocomplete="current-password" required autofocus>
  <input type="hidden" name="next" value="${escapeHtml(next)}">
  <button type="submit">Enter</button>
  <p>The live site is <a href="https://camascommons.org">camascommons.org</a>.</p>
</form>
</body>
</html>`;
  return new Response(html, {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (LIVE_HOSTS.has(url.hostname)) {
    return url.pathname === LOGIN_PATH ? Response.redirect(`${url.origin}/`, 302) : next();
  }

  if (url.pathname === '/robots.txt') {
    return new Response('# Preview site: not for search engines\nUser-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }

  if (url.pathname === LOGIN_PATH) {
    if (request.method !== 'POST') return loginPage('/', false);
    const form = await request.formData();
    const password = String(form.get('password') || '');
    const destination = safeNext(String(form.get('next') || '/'));
    if (!(await passwordOk(password, env))) return loginPage(destination, true);
    return new Response(null, {
      status: 303,
      headers: {
        Location: destination,
        'Set-Cookie': `${COOKIE_NAME}=${await cookieValueFor(password)}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
        'Cache-Control': 'no-store',
      },
    });
  }

  if (!(await cookieOk(request, env))) {
    if (url.pathname.startsWith('/api/')) {
      return new Response('Sign in to the test site first.', { status: 401, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
    }
    return loginPage(url.pathname + url.search, false);
  }

  const response = await next();
  const tagged = new Response(response.body, response);
  tagged.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return tagged;
}
