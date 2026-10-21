// robots.txt, generated at build time. Search engines, AI search and assistants are
// welcome on the live site; admin and API paths stay out. Any non-main build
// (dev.camascommons.org, previews) asks every crawler to stay away.
const branch = process.env.CF_PAGES_BRANCH || '';
const isPreview = Boolean(branch) && branch !== 'main';

const live = `# camascommons.org
User-agent: *
Content-Signal: search=yes, ai-input=yes
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: https://camascommons.org/sitemap.xml
`;

const preview = `# Preview build: not for search engines
User-agent: *
Disallow: /
`;

export function GET() {
  return new Response(isPreview ? preview : live, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
