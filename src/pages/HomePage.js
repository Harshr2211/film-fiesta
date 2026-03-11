import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';
import renderSkeletons from '../components/skeleton';
import tmdb from '../api/tmdb';
import MoviesListPage from './MoviesListPage';
import { getDailyRecommendationCount, getRecommendationProfile, hasRecommendationProfile, loadRecommendationFeed } from '../utils/recommendations';
import { getSavedMovies } from '../utils/userData';

const HomePage = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const count = getDailyRecommendationCount();
  const hasProfile = hasRecommendationProfile(auth?.user?.name);
  const [topPicks, setTopPicks] = useState([]);
  const [isRecoLoading, setIsRecoLoading] = useState(false);
  const [heroMovie, setHeroMovie] = useState(null);
  const [bollywoodPicks, setBollywoodPicks] = useState([]);
  const [southIndianPicks, setSouthIndianPicks] = useState([]);
  const recent = getSavedMovies(auth?.user?.name, 'recent').slice(0, 4);
  const watchlist = getSavedMovies(auth?.user?.name, 'watchlist').slice(0, 4);

  useEffect(() => {
    let mounted = true;
    tmdb.getPopular(1)
      .then((data) => {
        if (!mounted) return;
        setHeroMovie((data?.results || [])[0] || null);
      })
      .catch(() => {
        if (!mounted) return;
        setHeroMovie(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      tmdb.discoverMovies({ with_origin_country: 'IN', with_original_language: 'hi', sort_by: 'popularity.desc', page: 1 }),
      tmdb.discoverMovies({ with_origin_country: 'IN', with_original_language: 'ta|te|ml|kn', sort_by: 'popularity.desc', page: 1 }),
    ])
      .then(([bollywood, southIndian]) => {
        if (!mounted) return;
        setBollywoodPicks((bollywood?.results || []).slice(0, 4));
        setSouthIndianPicks((southIndian?.results || []).slice(0, 4));
      })
      .catch(() => {
        if (!mounted) return;
        setBollywoodPicks([]);
        setSouthIndianPicks([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!auth?.user || !hasProfile) {
      setTopPicks([]);
      return;
    }

    const profile = getRecommendationProfile(auth.user.name);
    let mounted = true;
    setIsRecoLoading(true);
    loadRecommendationFeed(tmdb, profile, 3)
      .then((results) => {
        if (!mounted) return;
        setTopPicks(results);
      })
      .catch(() => {
        if (!mounted) return;
        setTopPicks([]);
      })
      .finally(() => {
        if (!mounted) return;
        setIsRecoLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [auth?.user, hasProfile]);

  return (
    <>
  <section className="mx-4 mt-6 overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(231,196,106,0.16),_transparent_25%),_radial-gradient(circle_at_80%_20%,_rgba(245,214,136,0.1),_transparent_25%),_linear-gradient(180deg,_#08060d_0%,_#100b17_55%,_#0a0712_100%)] text-white shadow-[0_35px_90px_rgba(2,6,23,0.5)]">
        <div className="grid gap-10 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-10">
          <div className="flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.38em] text-amber-200">FilmFiesta</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-5xl xl:text-6xl">
              Discover your next favorite movie in a beautifully curated cinema lounge.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              Search, save, rate, watch trailers, check streaming providers, and get personalized picks that feel tailored to your mood.
            </p>
            <div className="mt-7 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => navigate(hasProfile ? '/recommendations' : '/onboarding/recommendations')}
                className="rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:scale-[1.02]"
              >
                {hasProfile ? 'Open my personalized picks' : 'Take the taste quiz'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/movies/popular')}
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Browse trending movies
              </button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <HeroStat label="Watchlist" value={auth?.stats?.watchlistCount || 0} />
              <HeroStat label="Favorites" value={auth?.stats?.favoritesCount || 0} />
              <HeroStat label="Watched" value={auth?.stats?.watchedCount || 0} />
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm">
            {heroMovie ? (
              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70">
                <div className="relative h-72 overflow-hidden md:h-80">
                  <img
                    src={heroMovie.backdrop_path ? `https://image.tmdb.org/t/p/original/${heroMovie.backdrop_path}` : 'https://placehold.co/1400x700?text=Featured'}
                    alt={heroMovie.title || heroMovie.original_title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-xs uppercase tracking-[0.32em] text-amber-200">Featured tonight</p>
                    <h2 className="mt-3 text-2xl font-bold md:text-3xl">{heroMovie.title || heroMovie.original_title}</h2>
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-200">{heroMovie.overview}</p>
                    <button
                      type="button"
                      onClick={() => navigate(`/movies/${heroMovie.id}`)}
                      className="mt-5 rounded-2xl bg-amber-300 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/20"
                    >
                      Explore featured movie
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {auth?.user ? (
  <section className="mx-6 mt-8 mb-2 rounded-3xl border border-white/10 bg-gradient-to-r from-[#120d18] via-[#1a1323] to-[#0d0910] px-6 py-6 text-white shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-200 mb-2">Personalized</p>
              <h2 className="text-3xl font-bold">For You Today</h2>
              <p className="mt-2 max-w-2xl text-gray-300">
                {hasProfile
                  ? `Your curated ${count} best matches are ready for today. Jump back in and discover your next favorite film.`
                  : 'Take the quick taste quiz and unlock a personalized movie lineup built around your vibe.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(hasProfile ? '/recommendations' : '/onboarding/recommendations')}
              className="self-start rounded-2xl bg-amber-300 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:translate-y-[-1px] hover:bg-amber-200"
            >
              {hasProfile ? 'Open my picks' : 'Take the quiz'}
            </button>
          </div>
          {hasProfile ? (
            <div className="mt-6">
              <h3 className="mb-4 text-lg font-semibold text-amber-100">Your top 3 today</h3>
              {isRecoLoading ? (
                <div className="flex flex-wrap max-md:justify-evenly">{renderSkeletons(3)}</div>
              ) : topPicks.length > 0 ? (
                <div className="flex flex-wrap max-md:justify-evenly">
                  {topPicks.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {auth?.user ? (
        <section className="mx-6 mt-6 grid gap-6 xl:grid-cols-2">
          <SavedStrip
            title="Recently viewed"
            subtitle="Jump back into titles you opened recently."
            items={recent}
            fallback="Open a movie detail page and it will show up here."
          />
          <SavedStrip
            title="Your watchlist"
            subtitle="Quick access to the movies you plan to watch soon."
            items={watchlist}
            fallback="Use the watchlist button on cards or the movie details page."
          />
        </section>
      ) : null}

      <section className="mx-6 mt-6 grid gap-6 xl:grid-cols-2">
        <CinemaStrip
          title="Bollywood spotlight"
          subtitle="Popular Hindi-language titles and Indian cinema picks for your next movie night."
          items={bollywoodPicks}
          fallback="Bollywood picks are warming up — try again in a moment."
        />
        <CinemaStrip
          title="South Indian spotlight"
          subtitle="Trending Tamil, Telugu, Malayalam, and Kannada titles in one place."
          items={southIndianPicks}
          fallback="South Indian cinema picks are warming up — try again in a moment."
        />
      </section>

      <MoviesListPage apiPath="movie/now_playing" title="Home | FilmFiesta" />
    </>
  );
};

export default HomePage;

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
      <span className="block text-xs uppercase tracking-[0.28em] text-slate-400">{label}</span>
      <span className="mt-2 block text-2xl font-black text-white">{value}</span>
    </div>
  );
}

function CinemaStrip({ title, subtitle, items, fallback }) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,_rgba(8,17,31,0.96),_rgba(6,16,29,0.92))] p-6 text-white shadow-[0_25px_65px_rgba(2,6,23,0.35)]">
      <h3 className="text-2xl font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-300">{subtitle}</p>
      {items.length === 0 ? (
        <EmptyState label={fallback} ctaLabel="Explore recommendations" />
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <MovieCard key={`${title}-${item.id}`} movie={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label, ctaLabel }) {
  return (
    <div className="mt-5 rounded-[24px] border border-dashed border-white/10 bg-white/[0.04] px-5 py-6 text-center">
      <p className="text-sm leading-7 text-slate-300">{label}</p>
  {ctaLabel ? <p className="mt-2 text-xs uppercase tracking-[0.28em] text-amber-200">{ctaLabel}</p> : null}
    </div>
  );
}

function SavedStrip({ title, subtitle, items, fallback }) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,_rgba(8,17,31,0.96),_rgba(6,16,29,0.92))] p-6 text-white shadow-[0_25px_65px_rgba(2,6,23,0.35)]">
      <h3 className="text-2xl font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-300">{subtitle}</p>
      {items.length === 0 ? (
        <p className="mt-5 text-sm text-slate-400">{fallback}</p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <MovieCard key={`${title}-${item.id}`} movie={item} />
          ))}
        </div>
      )}
    </div>
  );
}
