// Keeps everything except camascommons.org out of search engines (dev.camascommons.org,
// *.pages.dev previews): adds an X-Robots-Tag header and serves a "stay away" robots.txt.
// Decided by the address being visited, since the build can't reliably tell which
// branch it's building. public/_routes.json limits this to pages and robots.txt, so
// images and other files don't run it.
const LIVE_HOSTS = new Set(['camascommons.org', 'www.camascommons.org']);

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (LIVE_HOSTS.has(url.hostname)) return next();

  if (url.pathname === '/robots.txt') {
    return new Response('# Preview site: not for search engines\nUser-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }

  const response = await next();
  const tagged = new Response(response.body, response);
  tagged.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return tagged;
}
