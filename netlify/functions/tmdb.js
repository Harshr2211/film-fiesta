const TMDB_BASE = 'https://api.themoviedb.org/3';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.TMDB_API_KEY;
  const readAccessToken = process.env.TMDB_READ_ACCESS_TOKEN || process.env.TMDB_V4_TOKEN;

  if (!apiKey && !readAccessToken) {
    return json(500, {
      code: 'TMDB_PROXY_CONFIG_MISSING',
      error: 'Missing TMDB credentials. Set TMDB_API_KEY (or TMDB_READ_ACCESS_TOKEN) in Netlify environment variables.',
    });
  }

  const path = (event.queryStringParameters && event.queryStringParameters.path) || '';
  if (!path || !path.startsWith('/')) {
    return json(400, { error: 'Invalid or missing query parameter: path' });
  }

  const tmdbUrl = new URL(`${TMDB_BASE}${path}`);
  const query = event.queryStringParameters || {};

  Object.entries(query).forEach(([key, value]) => {
    if (key === 'path') return;
    if (value === undefined || value === null || value === '') return;
    tmdbUrl.searchParams.set(key, String(value));
  });

  if (apiKey) {
    tmdbUrl.searchParams.set('api_key', apiKey);
  }

  const headers = {};
  if (!apiKey && readAccessToken) {
    headers.Authorization = `Bearer ${readAccessToken}`;
  }

  try {
    const upstream = await fetch(tmdbUrl.toString(), { headers });
    const body = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';

    return {
      statusCode: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=60',
      },
      body,
    };
  } catch (error) {
    return json(502, {
      error: 'TMDB proxy request failed',
      details: error.message,
    });
  }
};
