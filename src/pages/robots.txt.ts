// robots.txt for camascommons.org. Search engines, AI search and assistants are
// welcome; admin and API paths stay out. On dev.camascommons.org and previews,
// functions/_middleware.js replaces this with a "stay away" version.

const live = `# camascommons.org
User-agent: *
Content-Signal: search=yes, ai-input=yes
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: https://camascommons.org/sitemap.xml
`;

export function GET() {
  return new Response(live, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
