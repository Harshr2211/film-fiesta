import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import renderSkeletons from '../components/skeleton';
import useDynamicTitle from '../hooks/useDynamicTitle';
import tmdb from '../api/tmdb';
import { useAuth } from '../context/AuthContext';
import {
  buildRecommendationParams,
  getDailyRecommendationCount,
  getRecommendationReasons,
  getRecommendationProfile,
  loadRecommendationFeed,
} from '../utils/recommendations';
import { getSavedMovies } from '../utils/userData';

const RecommendationPage = () => {
  useDynamicTitle('Recommended For You | FilmFiesta');
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useMemo(() => getRecommendationProfile(auth?.user?.name), [auth?.user?.name]);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [streamingMatches, setStreamingMatches] = useState({});
  const [filters, setFilters] = useState({
    region: auth?.preferences?.preferredRegion || 'IN',
    excludeSeen: auth?.preferences?.hideSeenRecommendations || false,
    streamingOnly: auth?.preferences?.recommendationOnlyStreaming || false,
  });
  const count = getDailyRecommendationCount();
  const watchedIds = useMemo(
    () => new Set(getSavedMovies(auth?.user?.name, 'watched').map((item) => item.id)),
    [auth?.user?.name, auth?.stats?.watchedCount]
  );
  const watchedKey = useMemo(() => Array.from(watchedIds).sort((a, b) => a - b).join(','), [watchedIds]);

  useEffect(() => {
    if (!profile) {
      navigate('/onboarding/recommendations');
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setError(null);

    const params = buildRecommendationParams(profile);
    loadRecommendationFeed(tmdb, { ...profile, ...filters, ...params }, count + 6)
      .then((curated) => {
        if (!mounted) return;
        const filtered = curated.filter((movie) => (filters.excludeSeen ? !watchedIds.has(movie.id) : true));
        setMovies(filtered.slice(0, count));

        Promise.all(filtered.slice(0, count + 4).map(async (movie) => {
          try {
            const res = await tmdb.getWatchProviders(movie.id);
            const regionData = res?.results?.[filters.region] || res?.results?.IN || res?.results?.US || null;
            const hasStreaming = !!(regionData?.flatrate && regionData.flatrate.length);
            return [movie.id, { hasStreaming, providers: regionData?.flatrate || [] }];
          } catch (e) {
            return [movie.id, { hasStreaming: false, providers: [] }];
          }
        })).then((entries) => {
          if (!mounted) return;
          const nextMatches = Object.fromEntries(entries);
          setStreamingMatches(nextMatches);
          if (filters.streamingOnly) {
            setMovies(filtered.filter((movie) => nextMatches[movie.id]?.hasStreaming).slice(0, count));
          }
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load recommendations');
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [count, filters, navigate, profile, watchedKey]);

  useEffect(() => {
    if (isLoading || error || !profile || !location.state?.fromQuiz) return undefined;

    setSecondsLeft(30);
    const intervalId = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [error, isLoading, location.state, navigate, profile]);

  return (
  <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(231,196,106,0.14),_transparent_24%),_radial-gradient(circle_at_80%_0%,_rgba(245,214,136,0.1),_transparent_26%),_linear-gradient(180deg,_#08060d_0%,_#100b17_45%,_#0a0712_100%)] px-6 pt-8 pb-14 text-white -mt-[1px]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-[0_30px_80px_rgba(2,6,23,0.45)] backdrop-blur-sm">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.4fr_0.9fr] md:px-10 md:py-10">
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.32em] text-amber-200">Curated for you</p>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">Your best {count} movie matches today</h1>
              <p className="mt-4 max-w-2xl text-slate-300 leading-8">
              Based on your taste profile, here are the strongest picks for {new Date().toLocaleDateString(undefined, { weekday: 'long' })}.
              </p>
              {!isLoading && !error && location.state?.fromQuiz ? (
                <p className="mt-4 text-sm text-slate-400">
                  Taking you back home in <span className="font-semibold text-amber-200">{secondsLeft}s</span>. Stay here if you want to explore, or retake your quiz anytime.
                </p>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-amber-200/10 bg-[#18111f] p-6 shadow-inner shadow-amber-500/5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Taste snapshot</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {Object.entries(profile || {})
                  .filter(([, value]) => value)
                  .slice(0, 6)
                  .map(([key, value]) => (
                    <span
                      key={key}
                      className="rounded-full border border-amber-200/20 bg-amber-300/10 px-4 py-2 text-sm font-medium capitalize text-amber-100"
                    >
                      {key}: {String(value).replace(/_/g, ' ')}
                    </span>
                  ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-300">
                Your feed blends discover data, recommendation scoring, and your saved vibe profile so the picks feel more editorial and personal.
              </p>
              {(profile?.industry === 'Bollywood' || profile?.industry === 'South Indian') ? (
                <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-100">
                  You’re currently tuned for <strong>{profile.industry}</strong> titles, so your feed is biased toward Indian cinema picks that better match that lane.
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => navigate('/onboarding/recommendations')}
                className="mt-6 inline-flex items-center rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:scale-[1.02]"
              >
                Retake quiz
              </button>
              <div className="mt-6 grid gap-3 text-sm text-slate-300">
                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span>Hide watched movies</span>
                  <input type="checkbox" checked={filters.excludeSeen} onChange={(e) => setFilters((prev) => ({ ...prev, excludeSeen: e.target.checked }))} />
                </label>
                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span>Streaming-first picks</span>
                  <input type="checkbox" checked={filters.streamingOnly} onChange={(e) => setFilters((prev) => ({ ...prev, streamingOnly: e.target.checked }))} />
                </label>
                <label className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span>Preferred region</span>
                  <select
                    value={filters.region}
                    onChange={(e) => setFilters((prev) => ({ ...prev, region: e.target.value }))}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white outline-none"
                  >
                    <option value="IN">India</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="CA">Canada</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}
        {isLoading && <div className="flex flex-wrap max-md:justify-evenly">{renderSkeletons(count)}</div>}
        {!isLoading && !error && movies.length === 0 && (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-6 py-8 text-center">
            <p className="text-lg font-semibold text-white">No matches yet for your current filters.</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">Try retaking the quiz, switching off streaming-only mode, or broadening your mood and language choices.</p>
          </div>
        )}
        {!isLoading && movies.length > 0 && (
          <div className="space-y-16">
            {movies.map((movie, index) => {
              const imageUrl = movie.backdrop_path
                ? `https://image.tmdb.org/t/p/original/${movie.backdrop_path}`
                : movie.poster_path
                ? `https://image.tmdb.org/t/p/w780/${movie.poster_path}`
                : 'https://placehold.co/1400x700?text=No+Image';

              return (
                <article
                  key={movie.id}
                  className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.05] shadow-[0_30px_80px_rgba(2,6,23,0.4)] backdrop-blur-sm"
                >
                  <div className="relative h-[320px] md:h-[420px] w-full overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={movie.title || movie.original_title}
                      className="h-full w-full object-cover scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#08111f] via-[#08111f]/55 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#08111f]/55 via-transparent to-amber-300/15" />
                    <div className="absolute left-0 right-0 bottom-0 p-6 md:p-8">
                      <p className="mb-3 text-xs uppercase tracking-[0.35em] text-amber-200">
                        Recommendation #{index + 1}
                      </p>
                      <h2 className="max-w-4xl text-3xl font-black tracking-tight text-white md:text-5xl">
                        {movie.title || movie.original_title}
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 p-6 md:p-8 lg:grid-cols-[1.45fr_0.95fr]">
                    <div>
                      <div className="mb-4 flex flex-wrap gap-2">
                        {getRecommendationReasons(movie, profile).map((reason) => (
                          <span
                            key={`${movie.id}-${reason}`}
                            className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100"
                          >
                            Why: {reason}
                          </span>
                        ))}
                      </div>

                      <p className="text-base leading-8 text-slate-200">
                        {movie.overview || 'A handpicked recommendation chosen from your taste profile for today.'}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                        {movie.release_date ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">📅 {movie.release_date}</span>
                        ) : null}
                        {movie.vote_average ? (
                          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-amber-200">⭐ {movie.vote_average}</span>
                        ) : null}
                        {movie.original_language ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 uppercase">🌐 {movie.original_language}</span>
                        ) : null}
                        {streamingMatches[movie.id]?.hasStreaming ? (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-emerald-200">Streaming available in {filters.region}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,_rgba(12,22,40,0.95),_rgba(8,17,31,0.95))] p-5">
                      <h3 className="text-lg font-semibold text-white">Why this fits you</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-300">
                        We picked this because it lines up with your current taste profile and today’s recommendation mood. It’s one of your strongest matches from TMDB’s discovery and recommendation feed.
                      </p>

                      <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/5 p-4 text-sm text-slate-300">
                        <p className="font-semibold text-amber-100">Premium tip</p>
                        <p className="mt-2 leading-7">Open the details page to jump into the trailer, watch providers, comments, and ratings without losing the vibe of your current recommendations.</p>
                      </div>

                      <Link
                        to={`/movies/${movie.id}`}
                        className="mt-6 inline-flex items-center rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:scale-[1.02]"
                      >
                        Open movie details
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationPage;
