const QUIZ_KEY = 'ff_reco_profile';

const optionMeta = {
  mood: {
    Exciting: '⚡',
    'Feel-good': '😊',
    Dark: '🌑',
    Emotional: '💙',
    'Mind-bending': '🧠',
    Cozy: '☕',
  },
  genre: {
    Action: '💥',
    Comedy: '😂',
    Drama: '🎭',
    Horror: '👻',
    'Sci-Fi': '🚀',
    Romance: '💘',
    Animation: '🎨',
    Thriller: '🔪',
  },
  pace: {
    Fast: '🏎️',
    Balanced: '🎬',
    'Slow-burn': '🕯️',
    Epic: '🏰',
  },
  era: {
    Latest: '🆕',
    'Modern classics': '🏆',
    'Any time': '🎞️',
    '90s & 2000s': '📼',
  },
  language: {
    English: '🇺🇸',
    International: '🌍',
    'Any language': '🗣️',
  },
  ending: {
    Happy: '🌈',
    Twisty: '🌀',
    Bittersweet: '🥀',
    'I am open': '✨',
  },
  watchtime: {
    'Under 2 hours': '⏱️',
    'Movie night length': '🍿',
    'Long epic': '🛡️',
  },
  company: {
    'Solo watch': '🎧',
    'With friends': '🫶',
    'Date night': '🥂',
    'Family time': '👨‍👩‍👧‍👦',
  },
  intensity: {
    'Easy watch': '🌤️',
    Immersive: '🎧',
    'Adrenaline rush': '🔥',
  },
  industry: {
    Hollywood: '🎥',
    'K-Drama': '🇰🇷',
    Bollywood: '💃',
    'South Indian': '🔥',
    Anime: '🌸',
    'Global mix': '🌐',
  },
};

export const QUESTION_OPTIONS = {
  mood: ['Exciting', 'Feel-good', 'Dark', 'Emotional', 'Mind-bending', 'Cozy'],
  pace: ['Fast', 'Balanced', 'Slow-burn', 'Epic'],
  era: ['Latest', 'Modern classics', 'Any time', '90s & 2000s'],
  language: ['English', 'International', 'Any language'],
  genre: ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Animation', 'Thriller'],
  ending: ['Happy', 'Twisty', 'Bittersweet', 'I am open'],
  watchtime: ['Under 2 hours', 'Movie night length', 'Long epic'],
  company: ['Solo watch', 'With friends', 'Date night', 'Family time'],
  intensity: ['Easy watch', 'Immersive', 'Adrenaline rush'],
  industry: ['Hollywood', 'K-Drama', 'Bollywood', 'South Indian', 'Anime', 'Global mix'],
};

const moodToGenres = {
  Exciting: [28, 12, 878],
  'Feel-good': [35, 10751, 16],
  Dark: [53, 27, 80],
  Emotional: [18, 10749, 36],
  'Mind-bending': [878, 9648, 53],
  Cozy: [35, 10749, 10751],
};

const genreMap = {
  Action: [28, 12],
  Comedy: [35],
  Drama: [18],
  Horror: [27],
  'Sci-Fi': [878],
  Romance: [10749],
  Animation: [16],
  Thriller: [53, 9648],
};

const industryPreferences = {
  Hollywood: { original_language: 'en' },
  'K-Drama': { with_original_language: 'ko' },
  Bollywood: { with_original_language: 'hi', with_origin_country: 'IN', region: 'IN' },
  'South Indian': { with_origin_country: 'IN', region: 'IN' },
  Anime: { with_genres: '16', with_original_language: 'ja' },
  'Global mix': {},
};

const paceToSort = {
  Fast: 'popularity.desc',
  Balanced: 'vote_average.desc',
  'Slow-burn': 'primary_release_date.desc',
};

function getProfileKey(username) {
  return username ? `${QUIZ_KEY}_${String(username).toLowerCase()}` : QUIZ_KEY;
}

export function saveRecommendationProfile(profile, username) {
  window.localStorage.setItem(getProfileKey(username), JSON.stringify(profile));
}

export function getRecommendationProfile(username) {
  try {
    const raw = window.localStorage.getItem(getProfileKey(username));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearRecommendationProfile(username) {
  window.localStorage.removeItem(getProfileKey(username));
}

export function hasRecommendationProfile(username) {
  return !!getRecommendationProfile(username);
}

export function getOptionBadge(field, option) {
  return optionMeta[field]?.[option] || '✨';
}

export function getDailyRecommendationCount(date = new Date()) {
  return date.getDay() % 2 === 0 ? 9 : 3;
}

export function buildRecommendationParams(profile = {}) {
  const genres = [
    ...(moodToGenres[profile.mood] || [28, 35, 18]),
    ...(genreMap[profile.genre] || []),
  ];
  const uniqueGenres = [...new Set(genres)];
  const currentYear = new Date().getFullYear();
  const industryParams = industryPreferences[profile.industry] || {};
  const southIndianLanguages = ['ta', 'te', 'ml', 'kn'];
  const withOriginalLanguage = profile.industry === 'South Indian'
    ? southIndianLanguages.join('|')
    : industryParams.with_original_language;

  return {
    with_genres: uniqueGenres.join(','),
    sort_by: paceToSort[profile.pace] || 'popularity.desc',
    vote_count_gte: 200,
    include_adult: false,
    language: 'en-US',
    page: 1,
    primary_release_date_gte: profile.era === 'Latest' ? `${currentYear - 2}-01-01` : undefined,
    primary_release_date_lte: profile.era === '90s & 2000s' ? '2009-12-31' : undefined,
    ...industryParams,
    with_original_language: withOriginalLanguage,
  };
}

export function scoreMovieAgainstProfile(movie, profile = {}) {
  let score = 0;
  const genres = [...(moodToGenres[profile.mood] || []), ...(genreMap[profile.genre] || [])];
  const movieGenres = movie.genre_ids || [];
  score += movieGenres.filter((id) => genres.includes(id)).length * 3;
  score += Math.min(Number(movie.vote_average || 0), 10);
  if (profile.era === 'Latest' && movie.release_date) {
    const year = Number(String(movie.release_date).slice(0, 4));
    if (year >= new Date().getFullYear() - 2) score += 4;
  }
  if (profile.era === 'Modern classics' && movie.release_date) {
    const year = Number(String(movie.release_date).slice(0, 4));
    if (year >= 2000 && year <= new Date().getFullYear() - 3) score += 3;
  }
  if (profile.era === '90s & 2000s' && movie.release_date) {
    const year = Number(String(movie.release_date).slice(0, 4));
    if (year >= 1990 && year <= 2009) score += 4;
  }
  if (profile.ending === 'Happy' && Number(movie.vote_average || 0) >= 7) score += 2;
  if (profile.ending === 'Twisty' && movieGenres.some((id) => [9648, 53].includes(id))) score += 3;
  if (profile.ending === 'Bittersweet' && movieGenres.includes(18)) score += 2;
  if (profile.watchtime === 'Under 2 hours' && Number(movie.runtime || 110) <= 120) score += 2;
  if (profile.watchtime === 'Long epic' && Number(movie.runtime || 140) >= 140) score += 2;
  if (profile.company === 'With friends' && movieGenres.some((id) => [28, 35, 12].includes(id))) score += 2;
  if (profile.company === 'Date night' && movieGenres.includes(10749)) score += 2;
  if (profile.company === 'Family time' && movieGenres.some((id) => [16, 10751].includes(id))) score += 2;
  if (profile.intensity === 'Adrenaline rush' && movieGenres.some((id) => [28, 53].includes(id))) score += 2;
  if (profile.intensity === 'Easy watch' && movieGenres.some((id) => [35, 10751].includes(id))) score += 2;
  if (profile.industry === 'Bollywood' && movie.original_language === 'hi') score += 4;
  if (profile.industry === 'South Indian' && ['ta', 'te', 'ml', 'kn'].includes(movie.original_language)) score += 5;
  return score;
}

export function curateRecommendations(results = [], profile = {}, count = 3) {
  return [...results]
    .sort((a, b) => scoreMovieAgainstProfile(b, profile) - scoreMovieAgainstProfile(a, profile))
    .slice(0, count);
}

export function getRecommendationReasons(movie, profile = {}) {
  const reasons = [];
  if (profile.mood) reasons.push(profile.mood);
  if (profile.genre) reasons.push(profile.genre);
  if (profile.industry) reasons.push(profile.industry);
  if (profile.ending && profile.ending !== 'I am open') reasons.push(profile.ending);
  return reasons.slice(0, 3);
}

export async function loadRecommendationFeed(tmdb, profile, count) {
  const discover = await tmdb.discoverMovies(buildRecommendationParams(profile));
  const discoverResults = discover?.results || [];

  if (discoverResults.length === 0) {
    return [];
  }

  const seedMovie = curateRecommendations(discoverResults, profile, 1)[0] || discoverResults[0];

  try {
    const tmdbRecommendations = await tmdb.getRecommendations(seedMovie.id, 1);
    const combined = [seedMovie, ...(tmdbRecommendations?.results || []), ...discoverResults];
    const deduped = combined.filter((movie, index, arr) => arr.findIndex((item) => item.id === movie.id) === index);
    return curateRecommendations(deduped, profile, count);
  } catch (e) {
    return curateRecommendations(discoverResults, profile, count);
  }
}
