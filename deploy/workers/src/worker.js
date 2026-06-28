import { Router } from 'itty-router';

const router = Router();

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

function toPreview(text, max = 220) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function readBodyText(request) {
  try {
    return await request.text();
  } catch {
    return '';
  }
}

function serializeHeaders(headers) {
  const out = {};
  for (const [k, v] of headers.entries()) out[k] = v;
  return out;
}

function serializeQuery(url) {
  const out = {};
  for (const [k, v] of url.searchParams.entries()) out[k] = v;
  return out;
}

router.options('*', () => new Response(null, { status: 204, headers: CORS_HEADERS }));

router.get('/health', (_request, env) => json({ status: 'ok', app: env.APP_NAME || 'webhook-witness' }));

router.post('/api/v1/capture/:source', async (request, env) => {
  const url = new URL(request.url);
  const bodyText = await readBodyText(request.clone());
  const source = request.params.source || 'unknown';
  const headersJson = JSON.stringify(serializeHeaders(request.headers));
  const queryJson = JSON.stringify(serializeQuery(url));
  const bodyPreview = toPreview(bodyText);
  const contentType = request.headers.get('content-type') || '';
  const ip = request.headers.get('cf-connecting-ip') || '';

  const result = await env.DB.prepare(
    `INSERT INTO events (source, method, content_type, ip, headers_json, query_json, body_text, body_preview, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(source, request.method, contentType, ip, headersJson, queryJson, bodyText, bodyPreview).run();

  return json({ ok: true, event_id: result.meta.last_row_id, source, received_at: new Date().toISOString() }, 201);
});

router.post('/api/v1/demo-seed', async (_request, env) => {
  const sample = {
    provider: 'stripe',
    type: 'invoice.payment_succeeded',
    customer_email: 'buyer@example.com',
    amount: 9900,
    currency: 'usd'
  };

  const bodyText = JSON.stringify(sample, null, 2);
  const result = await env.DB.prepare(
    `INSERT INTO events (source, method, content_type, ip, headers_json, query_json, body_text, body_preview, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    'stripe-demo',
    'POST',
    'application/json',
    '',
    JSON.stringify({ 'x-demo-seed': 'true' }),
    JSON.stringify({}),
    bodyText,
    toPreview(bodyText),
  ).run();

  return json({ ok: true, event_id: result.meta.last_row_id, message: 'Demo event captured' }, 201);
});

router.get('/api/v1/stats', async (_request, env) => {
  const total = await env.DB.prepare('SELECT COUNT(*) AS count FROM events').first();
  const sourceCount = await env.DB.prepare('SELECT COUNT(DISTINCT source) AS count FROM events').first();
  const latest = await env.DB.prepare('SELECT source, received_at FROM events ORDER BY id DESC LIMIT 1').first();
  return json({
    total_events: total?.count || 0,
    total_sources: sourceCount?.count || 0,
    latest_source: latest?.source || null,
    latest_received_at: latest?.received_at || null,
  });
});

router.get('/api/v1/events', async (request, env) => {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100);
  const rows = await env.DB.prepare(
    `SELECT id, source, method, content_type, ip, body_preview, received_at
     FROM events ORDER BY id DESC LIMIT ?`
  ).bind(limit).all();
  return json({ events: rows.results || [] });
});

router.get('/api/v1/events/:id', async (request, env) => {
  const row = await env.DB.prepare(
    `SELECT id, source, method, content_type, ip, headers_json, query_json, body_text, body_preview, received_at
     FROM events WHERE id = ?`
  ).bind(request.params.id).first();
  if (!row) return json({ error: 'Not found' }, 404);
  return json({
    ...row,
    headers: JSON.parse(row.headers_json || '{}'),
    query: JSON.parse(row.query_json || '{}'),
  });
});

router.get('/api/v1/replay-plan/:id', async (request, env) => {
  const row = await env.DB.prepare(
    `SELECT source, method, content_type, body_text FROM events WHERE id = ?`
  ).bind(request.params.id).first();
  if (!row) return json({ error: 'Not found' }, 404);

  const contentTypeHeader = row.content_type ? `-H ${JSON.stringify(`content-type: ${row.content_type}`)}` : '';
  const dataFlag = row.body_text ? `--data-binary ${JSON.stringify(row.body_text)}` : '';
  const curl = `curl -X ${row.method} ${contentTypeHeader} ${dataFlag} https://your-app.example.com/webhooks/${row.source}`.replace(/\s+/g, ' ').trim();
  return json({
    source: row.source,
    replay_target_hint: `https://your-app.example.com/webhooks/${row.source}`,
    curl_command: curl,
  });
});

router.all('*', () => json({ error: 'Not found' }, 404));

export default {
  fetch: (request, env, ctx) => router.fetch(request, env, ctx),
};
