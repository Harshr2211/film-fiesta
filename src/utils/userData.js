const STORAGE_PREFIX = 'ff_user_data';

function normalizeUsername(username) {
  return username ? String(username).trim().toLowerCase() : 'guest';
}

function getKey(username, section) {
  return `${STORAGE_PREFIX}_${normalizeUsername(username)}_${section}`;
}

function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
  return value;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function upsertMovieEntry(list = [], movie = {}, extras = {}) {
  const filtered = ensureArray(list).filter((item) => item?.id !== movie?.id);
  const next = {
    id: movie.id,
    title: movie.title || movie.original_title,
    poster_path: movie.poster_path || null,
    backdrop_path: movie.backdrop_path || null,
    overview: movie.overview || '',
    vote_average: movie.vote_average || null,
    release_date: movie.release_date || null,
    original_language: movie.original_language || null,
    updatedAt: new Date().toISOString(),
    ...extras,
  };
  return [next, ...filtered];
}

export function getSavedMovies(username, section) {
  return ensureArray(readJSON(getKey(username, section), []));
}

export function isMovieSaved(username, section, movieId) {
  return getSavedMovies(username, section).some((item) => item.id === movieId);
}

export function toggleSavedMovie(username, section, movie) {
  const current = getSavedMovies(username, section);
  const exists = current.some((item) => item.id === movie.id);
  const next = exists
    ? current.filter((item) => item.id !== movie.id)
    : upsertMovieEntry(current, movie);

  writeJSON(getKey(username, section), next);
  return { saved: !exists, items: next };
}

export function removeSavedMovie(username, section, movieId) {
  const current = getSavedMovies(username, section);
  const next = current.filter((item) => item.id !== movieId);
  writeJSON(getKey(username, section), next);
  return next;
}

export function addRecentMovie(username, movie) {
  const current = getSavedMovies(username, 'recent');
  const next = upsertMovieEntry(current, movie).slice(0, 12);
  writeJSON(getKey(username, 'recent'), next);
  return next;
}

export function getUserPreferences(username) {
  return {
    themeAccent: 'emerald',
    preferredRegion: 'IN',
    autoplayTrailers: true,
    recommendationOnlyStreaming: false,
    hideSeenRecommendations: false,
    ...ensureObject(readJSON(getKey(username, 'preferences'), {})),
  };
}

export function updateUserPreferences(username, patch = {}) {
  const next = {
    ...getUserPreferences(username),
    ...patch,
  };
  writeJSON(getKey(username, 'preferences'), next);
  return next;
}

export function getProfileStats(username) {
  const watchlist = getSavedMovies(username, 'watchlist');
  const favorites = getSavedMovies(username, 'favorites');
  const watched = getSavedMovies(username, 'watched');
  const recent = getSavedMovies(username, 'recent');

  return {
    watchlistCount: watchlist.length,
    favoritesCount: favorites.length,
    watchedCount: watched.length,
    recentCount: recent.length,
  };
}

export function getUserProfile(username) {
  const base = ensureObject(readJSON(getKey(username, 'profile'), null));
  return {
    bio: '',
    avatar: '',
    tagline: 'Curating the next great movie night.',
    favoriteQuote: '',
    ...base,
  };
}

export function updateUserProfile(username, patch = {}) {
  const next = {
    ...getUserProfile(username),
    ...patch,
  };
  writeJSON(getKey(username, 'profile'), next);
  return next;
}

export function clearUserData(username) {
  ['watchlist', 'favorites', 'watched', 'recent', 'preferences', 'profile', 'notifications']
    .forEach((section) => window.localStorage.removeItem(getKey(username, section)));
}

export function getNotifications(username) {
  return ensureArray(readJSON(getKey(username, 'notifications'), []));
}

export function pushNotification(username, notification) {
  const createdAt = new Date().toISOString();
  const current = getNotifications(username);
  const next = [
    {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt,
      expiresAt: new Date(Date.now() + 3000).toISOString(),
      type: 'info',
      ...notification,
    },
    ...current,
  ].slice(0, 20);

  writeJSON(getKey(username, 'notifications'), next);
  return next;
}

export function removeNotification(username, notificationId) {
  const next = getNotifications(username).filter((item) => item.id !== notificationId);
  writeJSON(getKey(username, 'notifications'), next);
  return next;
}
