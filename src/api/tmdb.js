const TMDB_PROXY_PATH = process.env.REACT_APP_TMDB_PROXY_PATH || '/.netlify/functions/tmdb';

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

    if (!res.ok) {
      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
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

    return text ? JSON.parse(text) : {};
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
