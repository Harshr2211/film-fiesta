const TMDB_PROXY_PATH = process.env.REACT_APP_TMDB_PROXY_PATH || '/.netlify/functions/tmdb';
const TMDB_DIRECT_BASE = process.env.REACT_APP_TMDB_BASE || 'https://api.themoviedb.org/3';
const TMDB_DIRECT_KEY = process.env.REACT_APP_TMDB_API_KEY || process.env.REACT_APP_API_KEY || '';
const TMDB_DIRECT_TOKEN = process.env.REACT_APP_TMDB_READ_ACCESS_TOKEN || process.env.REACT_APP_TMDB_V4_TOKEN || '';
const CAN_USE_DIRECT_TMDB = Boolean(TMDB_DIRECT_KEY || TMDB_DIRECT_TOKEN);

function looksLikeHtml(text = '') {
  const trimmed = String(text).trim().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.startsWith('<');
}

function parseJsonOrThrow(text, contextLabel) {
  if (!text) return {};
  if (looksLikeHtml(text)) {
    throw new Error(`${contextLabel}: received HTML instead of JSON. This usually means the TMDB proxy route is unavailable in local dev.`);
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${contextLabel}: invalid JSON response. Raw response starts with: ${String(text).slice(0, 120)}`);
  }
}

function shouldFallbackToDirect(res, text) {
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('text/html') || looksLikeHtml(text) || (res.status === 404 && text.includes('Cannot GET /.netlify/functions/tmdb'));
}

async function requestDirect(path, params = {}) {
  const url = new URL(`${TMDB_DIRECT_BASE}${path}`);

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const headers = {};
  if (TMDB_DIRECT_KEY) {
    url.searchParams.set('api_key', TMDB_DIRECT_KEY);
  } else if (TMDB_DIRECT_TOKEN) {
    headers.Authorization = `Bearer ${TMDB_DIRECT_TOKEN}`;
  }

  // eslint-disable-next-line no-console
  console.debug('TMDB direct request:', url.toString());

  const res = await fetch(url.toString(), { headers });
  const text = await res.text();
  const payload = parseJsonOrThrow(text, 'TMDB direct response');

  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${payload?.status_message || payload?.error || text}`);
  }

  return payload;
}

async function request(path, params = {}) {
  const query = new URLSearchParams();
  query.set('path', path);

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) query.set(k, String(v));
  });

  const url = `${TMDB_PROXY_PATH}?${query.toString()}`;

  // eslint-disable-next-line no-console
  console.debug('TMDB request via proxy:', url);

  try {
    const res = await fetch(url);
    const text = await res.text();

    if (shouldFallbackToDirect(res, text)) {
      if (CAN_USE_DIRECT_TMDB) {
        // eslint-disable-next-line no-console
        console.warn('TMDB proxy unavailable in local dev; falling back to direct TMDB request.');
        return requestDirect(path, params);
      }
      throw new Error(
        'TMDB proxy endpoint is not available in local dev. Run with Netlify dev, or set REACT_APP_TMDB_API_KEY for local direct fallback.'
      );
    }

    if (!res.ok) {
      let payload = null;
      try {
        payload = parseJsonOrThrow(text, 'TMDB proxy error');
      } catch (e) {
        payload = null;
      }

      if (payload?.code === 'TMDB_PROXY_CONFIG_MISSING') {
        throw new Error(
          'TMDB proxy is missing credentials. Add TMDB_API_KEY (or TMDB_READ_ACCESS_TOKEN) in Netlify environment variables and redeploy.'
        );
      }

      if (res.status === 404 && text.includes('Cannot GET /.netlify/functions/tmdb')) {
        throw new Error(
          'TMDB proxy endpoint not found. Ensure netlify/functions/tmdb.js exists and Netlify Functions are enabled.'
        );
      }

      if (res.status === 401 || payload?.status_code === 7) {
        throw new Error(
          `TMDB 401: Invalid credentials from proxy. ${payload?.error || text}`
        );
      }

      throw new Error(`TMDB ${res.status}: ${payload?.error || text}`);
    }

    return parseJsonOrThrow(text, 'TMDB proxy response');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('TMDB request failed:', err);
    throw err;
  }
}

const tmdb = {
  getList: (apiPath, pageOrParams = 1) => {
    const params = typeof pageOrParams === 'number' ? { page: pageOrParams } : (pageOrParams || {});
    return request(`/${apiPath}`, params);
  },
  getPopular: (page = 1) => request(`/movie/popular`, { page }),
  getTopRated: (page = 1) => request(`/movie/top_rated`, { page }),
  getUpcoming: (page = 1) => request(`/movie/upcoming`, { page }),
  search: (query, page = 1) => request(`/search/movie`, { query, page }),
  getMovie: (id) => request(`/movie/${id}`),
  getMovieReleaseDates: (id) => request(`/movie/${id}/release_dates`),
  getMovieCredits: (id) => request(`/movie/${id}/credits`),
  getWatchProviders: (id) => request(`/movie/${id}/watch/providers`),
  getMovieVideos: (id) => request(`/movie/${id}/videos`),
  getSimilarMovies: (id, page = 1) => request(`/movie/${id}/similar`, { page }),
  getRecommendations: (id, page = 1) => request(`/movie/${id}/recommendations`, { page }),
  getPerson: (id) => request(`/person/${id}`),
  getPersonMovieCredits: (id) => request(`/person/${id}/movie_credits`),
  discoverMovies: (params = {}) => request(`/discover/movie`, params),
};

export default tmdb;
