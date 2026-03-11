const BASE = process.env.REACT_APP_TMDB_BASE || "https://api.themoviedb.org/3";
const KEY =
  process.env.REACT_APP_TMDB_API_KEY ||
  process.env.REACT_APP_API_KEY ||
  (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('REACT_APP_TMDB_API_KEY')) ||
  "";

if (!KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "TMDB API key not found. Set REACT_APP_TMDB_API_KEY or REACT_APP_API_KEY in .env(.local) and restart the dev server."
  );
}

async function request(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", KEY);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  // eslint-disable-next-line no-console
  console.debug("TMDB request:", url.toString());

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TMDB ${res.status}: ${text}`);
    }
    return await res.json();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("TMDB request failed:", err);
    throw err;
  }
}

export default {
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
