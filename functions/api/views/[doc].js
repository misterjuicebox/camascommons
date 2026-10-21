// Document view counter: POST /api/views/<doc> records a view, GET returns the count.
//
// Counts live in a Workers KV namespace bound to this Pages project as VIEWS
// (Cloudflare dashboard → Workers & Pages → camascommons → Settings → Bindings →
// KV namespace, variable name VIEWS). Until that binding exists every request
// answers 503 and the homepage keeps the view badges hidden — no made-up numbers.
//
// A view is one visitor per document per day (repeat clicks from the same
// connection within 24 hours aren't counted again).

const DOCS = new Set([
  'proposal-pdf',
  'prospectus-pdf',
  'open-letter-pdf',
  'open-letter-audio',
  'open-letter-visual',
]);

const DAY_SECONDS = 24 * 60 * 60;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

async function visitorKey(request, doc) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`${ip}|${doc}|${day}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(hash)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `seen:${hex}`;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const doc = String(params.doc || '');

  if (!DOCS.has(doc)) return json({ success: false, error: 'Unknown document.' }, 404);
  if (!env.VIEWS) return json({ success: false, error: 'View counting is not set up yet.' }, 503);

  const countKey = `views:${doc}`;

  if (request.method === 'GET') {
    const views = Number(await env.VIEWS.get(countKey)) || 0;
    return json({ success: true, document: doc, views });
  }

  if (request.method === 'POST') {
    const seenKey = await visitorKey(request, doc);
    if (await env.VIEWS.get(seenKey)) return json({ success: true, counted: false });

    await env.VIEWS.put(seenKey, '1', { expirationTtl: DAY_SECONDS });
    const views = (Number(await env.VIEWS.get(countKey)) || 0) + 1;
    await env.VIEWS.put(countKey, String(views));
    return json({ success: true, counted: true, views });
  }

  return json({ success: false, error: 'Method not allowed.' }, 405);
}
