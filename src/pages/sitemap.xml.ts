// sitemap.xml: the public pages, with the build date as their last change.
const PAGES = ['/'];

export function GET() {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = PAGES.map(
    (path) => `  <url><loc>https://camascommons.org${path}</loc><lastmod>${lastmod}</lastmod></url>`
  ).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
