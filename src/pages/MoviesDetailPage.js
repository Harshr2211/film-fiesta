import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import tmdb from '../api/tmdb';
import { useAuth } from '../context/AuthContext';
import useDynamicTitle from '../hooks/useDynamicTitle';
import { addRecentMovie, isMovieSaved, toggleSavedMovie, updateUserPreferences } from '../utils/userData';

const MoviesDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [certification, setCertification] = useState(null);
  const [watchProviders, setWatchProviders] = useState(null);
  const [trailer, setTrailer] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [credits, setCredits] = useState({ cast: [], crew: [] });
  const [providerRegion, setProviderRegion] = useState('IN');
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);
    tmdb
      .getMovie(id)
      .then((data) => {
        if (!mounted) return;
        setMovie(data);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load movie');
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const auth = useAuth();
  const username = auth?.user?.name;

  useEffect(() => {
    if (auth?.preferences?.preferredRegion) {
      setProviderRegion(auth.preferences.preferredRegion);
    }
  }, [auth?.preferences?.preferredRegion]);

  useEffect(() => {
    if (!movie?.id) return;
    addRecentMovie(username, movie);
  }, [movie?.id, movie, username]);

  useEffect(() => {
    let mounted = true;
    tmdb
      .getSimilarMovies(id)
      .then((data) => {
        if (!mounted) return;
        setSimilarMovies((data?.results || []).slice(0, 6));
      })
      .catch(() => {
        if (!mounted) return;
        setSimilarMovies([]);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    tmdb
      .getMovieVideos(id)
      .then((data) => {
        if (!mounted) return;
        const videos = data?.results || [];
        const bestTrailer = videos.find((item) => item.site === 'YouTube' && item.type === 'Trailer')
          || videos.find((item) => item.site === 'YouTube' && item.type === 'Teaser')
          || null;
        setTrailer(bestTrailer);
      })
      .catch(() => {
        if (!mounted) return;
        setTrailer(null);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    tmdb
      .getMovieReleaseDates(id)
      .then((data) => {
        if (!mounted) return;
        setCertification(resolveCertificationBadge(data, providerRegion));
      })
      .catch(() => {
        if (!mounted) return;
        setCertification(null);
      });

    return () => {
      mounted = false;
    };
  }, [id, providerRegion]);

  useEffect(() => {
    let mounted = true;
    tmdb
      .getWatchProviders(id)
      .then((data) => {
        if (!mounted) return;
        const region = data?.results?.[providerRegion] || data?.results?.IN || data?.results?.US || null;
        setWatchProviders(region);
      })
      .catch(() => {
        if (!mounted) return;
        setWatchProviders(null);
      });

    return () => {
      mounted = false;
    };
  }, [id, providerRegion]);

  useEffect(() => {
    let mounted = true;
    tmdb
      .getMovieCredits(id)
      .then((data) => {
        if (!mounted) return;
        setCredits({
          cast: (data?.cast || []).slice(0, 10),
          crew: (data?.crew || []).slice(0, 8),
        });
      })
      .catch(() => {
        if (!mounted) return;
        setCredits({ cast: [], crew: [] });
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const title = movie ? `${movie.title || movie.original_title} | FilmFiesta` : 'Movie Details | FilmFiesta';
  useDynamicTitle(title);

  if (isLoading) return <div className="min-h-screen bg-slate-50 p-6 text-slate-800 dark:bg-[#0b1220] dark:text-gray-200">Loading movie details...</div>;
  if (error) return <div className="min-h-screen bg-slate-50 p-6 text-red-500 dark:bg-[#0b1220] dark:text-red-400">Error: {error}</div>;
  if (!movie) return <div className="min-h-screen bg-slate-50 p-6 text-slate-800 dark:bg-[#0b1220] dark:text-gray-200">No movie found.</div>;

  const imageUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w780/${movie.backdrop_path}`
    : movie.poster_path
    ? `https://image.tmdb.org/t/p/w500/${movie.poster_path}`
    : 'https://placehold.co/780x439?text=No+Image';

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500/${movie.poster_path}`
    : imageUrl;

  const handleSaveMovie = (section) => {
    if (!auth?.user) {
      auth?.openLogin?.();
      return;
    }

    const result = toggleSavedMovie(username, section, movie);
    auth?.refreshUserMeta?.();
    auth?.notify?.({
      type: 'success',
      title: result.saved ? 'Saved successfully' : 'Removed successfully',
      message: `${movie.title || movie.original_title} ${result.saved ? 'is now in' : 'was removed from'} your ${section}.`,
    });
  };

  const handleRegionChange = (event) => {
    const nextRegion = event.target.value;
    setProviderRegion(nextRegion);
    updateUserPreferences(username, { preferredRegion: nextRegion });
    auth?.savePreferences?.({ preferredRegion: nextRegion });
  };

  return (
  <div className="min-h-screen bg-[linear-gradient(180deg,_#fcf8ff_0%,_#f4ecff_45%,_#f8fafc_100%)] px-6 py-8 text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_transparent_35%),_linear-gradient(180deg,_#0b1220_0%,_#111827_45%,_#0f172a_100%)] dark:text-white">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
              return;
            }
            navigate('/movies/popular');
          }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm text-amber-700 shadow-sm transition hover:border-amber-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-amber-200 dark:hover:border-amber-300/60 dark:hover:bg-white/10"
        >
          ← Back to previous page
        </button>
        <section className="relative mt-4 overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(148,163,184,0.22)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/35">
          <div className="relative h-[280px] w-full md:h-[420px] xl:h-[520px] overflow-hidden">
            <img src={imageUrl} alt={movie.title || movie.original_title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/10 dark:from-[#020617] dark:via-[#020617]/35 dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-transparent to-amber-300/15 dark:from-[#020617]/75 dark:to-amber-200/15" />
          </div>

          <div className="relative px-6 pb-8 pt-0 md:px-10 lg:px-14">
            <div className="-mt-16 flex flex-col gap-6 lg:-mt-24 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-end gap-5">
                <div className="hidden overflow-hidden rounded-[28px] border border-white/20 bg-white/10 shadow-2xl shadow-black/30 backdrop-blur-sm sm:block w-[150px] md:w-[190px] lg:w-[220px]">
                  <img src={posterUrl} alt={`${movie.title || movie.original_title} poster`} className="h-full w-full object-cover" />
                </div>
                <div className="max-w-4xl">
                  <p className="mb-3 text-xs uppercase tracking-[0.35em] text-amber-200 dark:text-amber-200">Now showing</p>
                  <h1 className="bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-5xl xl:text-6xl">
                    {movie.title || movie.original_title}
                  </h1>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-100">
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">📅 {movie.release_date || 'Unknown release'}</span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">⏱️ {movie.runtime || '—'} min</span>
                    <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-4 py-2 text-amber-100 backdrop-blur-sm">⭐ {movie.vote_average}</span>
                    <CertificationBadge certification={certification} />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleSaveMovie('watchlist')}
                      className={`rounded-full px-5 py-3 text-sm font-semibold transition ${isMovieSaved(username, 'watchlist', movie.id) ? 'bg-amber-300 text-slate-950' : 'border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15'}`}
                    >
                      {isMovieSaved(username, 'watchlist', movie.id) ? 'In Watchlist' : '+ Add to Watchlist'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveMovie('favorites')}
                      className={`rounded-full px-5 py-3 text-sm font-semibold transition ${isMovieSaved(username, 'favorites', movie.id) ? 'bg-rose-400 text-slate-950' : 'border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15'}`}
                    >
                      {isMovieSaved(username, 'favorites', movie.id) ? 'Favorited' : '♥ Add to Favorites'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveMovie('watched')}
                      className={`rounded-full px-5 py-3 text-sm font-semibold transition ${isMovieSaved(username, 'watched', movie.id) ? 'bg-amber-300 text-slate-950' : 'border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15'}`}
                    >
                      {isMovieSaved(username, 'watched', movie.id) ? 'Marked Watched' : '✓ Mark as Watched'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-lg shadow-slate-200/70 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/45 dark:shadow-black/20">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Quick vibe</p>
                <p className="mt-2 max-w-sm text-sm leading-7 text-slate-700 dark:text-slate-200">
                  A premium all-in-one movie page with trailer, streaming info, ratings, comments, and similar titles — all stacked under the hero.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
                <div className="mb-6 flex flex-wrap gap-2">
                  {[
                    ['overview', 'Overview'],
                    ['watch', 'Watch'],
                    ['cast', 'Cast'],
                    ['similar', 'Similar'],
                    ['community', 'Community'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === key ? 'bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20' : 'border border-slate-200 bg-white text-slate-700 hover:border-amber-300 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {activeTab === 'overview' ? (
                  <>
                <p className="text-base leading-8 text-slate-700 dark:text-slate-200">{movie.overview}</p>

                {movie.genres && (
                  <div className="mt-6">
                    <strong className="mr-2 text-amber-700 dark:text-amber-200">Genres:</strong>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {movie.genres.map((g) => (
                        <span key={g.id || g.name} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                  </>
                ) : null}

                {activeTab === 'watch' ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-3 text-xl font-semibold text-slate-900 dark:text-white">Where to Watch</h3>
                      <WatchProviders providers={watchProviders} />
                    </div>
                    <div>
                      <h3 className="mb-3 text-xl font-semibold text-slate-900 dark:text-white">Trailer</h3>
                      <TrailerPanel trailer={trailer} />
                    </div>
                  </div>
                ) : null}

                {activeTab === 'cast' ? (
                  <CreditsPanel credits={credits} />
                ) : null}

                {activeTab === 'similar' ? (
                  <SimilarMovies movies={similarMovies} />
                ) : null}

                {activeTab === 'community' ? (
                  <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                      <h2 className="mb-3 text-2xl font-semibold text-slate-900 dark:text-white">Rate this movie</h2>
                      <Rating movieId={movie.id} />
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                      <h2 className="mb-3 text-2xl font-semibold text-slate-900 dark:text-white">Comments</h2>
                      <Comments movieId={movie.id} />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_100%)] p-6 shadow-xl shadow-slate-200/70 dark:border-white/10 dark:bg-[linear-gradient(180deg,_rgba(15,23,42,0.95)_0%,_rgba(2,6,23,0.85)_100%)] dark:shadow-black/20">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">About this film</p>
                <div className="mt-5 grid gap-4 text-sm text-slate-700 dark:text-slate-200">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="block text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Original language</span>
                    <span className="mt-2 block text-base font-semibold uppercase">{movie.original_language || 'N/A'}</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="block text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Popularity</span>
                    <span className="mt-2 block text-base font-semibold">{movie.popularity ? Math.round(movie.popularity) : 'N/A'}</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="block text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Votes</span>
                    <span className="mt-2 block text-base font-semibold">{movie.vote_count || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Where to Watch</h2>
                  <select value={providerRegion} onChange={handleRegionChange} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-slate-900/80 dark:text-white">
                    <option value="IN">India</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="CA">Canada</option>
                  </select>
                </div>
                <WatchProviders providers={watchProviders} />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                <h2 className="mb-3 text-2xl font-semibold text-slate-900 dark:text-white">Watch Trailer</h2>
                <TrailerPanel trailer={trailer} />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
              <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">Cast & Crew</h2>
              <CreditsPanel credits={credits} />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
              <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-white">More like this</h2>
              <SimilarMovies movies={similarMovies} />
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                <h2 className="mb-3 text-2xl font-semibold text-slate-900 dark:text-white">Rate this movie</h2>
                <Rating movieId={movie.id} />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/40">
                <h2 className="mb-3 text-2xl font-semibold text-slate-900 dark:text-white">Comments</h2>
                <Comments movieId={movie.id} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

function resolveCertificationBadge(payload, preferredRegion = 'IN') {
  const results = payload?.results || [];
  const pickedRegion = results.find((item) => item.iso_3166_1 === preferredRegion)
    || results.find((item) => item.iso_3166_1 === 'IN')
    || results.find((item) => item.iso_3166_1 === 'US')
    || results[0];

  const rawCertification = pickedRegion?.release_dates?.find((entry) => entry.certification)?.certification?.trim();
  if (!rawCertification) return null;

  const normalized = normalizeCertification(rawCertification, pickedRegion?.iso_3166_1);
  return normalized ? { ...normalized, region: pickedRegion?.iso_3166_1 || preferredRegion } : null;
}

function normalizeCertification(value, region) {
  const upper = String(value || '').trim().toUpperCase();

  if (!upper) return null;

  if (['A', 'R', 'NC-17', 'TV-MA', '18', '18A'].includes(upper)) {
    return { label: 'A', className: 'border-red-400/40 bg-red-500/20 text-red-100' };
  }

  if (['U/A', 'UA', 'PG', 'PG-13', '12', '12A', '15', 'TV-14'].includes(upper)) {
    return { label: 'U/A', className: 'border-amber-300/45 bg-amber-400/20 text-amber-50' };
  }

  if (['U', 'G', 'TV-G', 'TV-Y', 'TV-Y7'].includes(upper)) {
    return { label: 'U', className: 'border-emerald-400/45 bg-emerald-500/20 text-emerald-50' };
  }

  if (region === 'IN') {
    if (upper.includes('UA')) {
      return { label: 'U/A', className: 'border-amber-300/45 bg-amber-400/20 text-amber-50' };
    }
    if (upper.includes('U')) {
      return { label: 'U', className: 'border-emerald-400/45 bg-emerald-500/20 text-emerald-50' };
    }
    if (upper.includes('A')) {
      return { label: 'A', className: 'border-red-400/40 bg-red-500/20 text-red-100' };
    }
  }

  return { label: upper, className: 'border-white/20 bg-white/10 text-white' };
}

function CertificationBadge({ certification }) {
  if (!certification?.label) return null;

  return (
    <span className={`rounded-full border px-4 py-2 font-semibold backdrop-blur-sm ${certification.className}`}>
      🎟️ {certification.label}
    </span>
  );
}

function ProviderGroup({ title, items }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{title}</h3>
      <div className="flex flex-wrap gap-3">
        {items.map((provider) => (
          <div
            key={`${title}-${provider.provider_id}`}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-slate-900/80"
          >
            <img
              src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
              alt={provider.provider_name}
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{provider.provider_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimilarMovies({ movies }) {
  if (!movies || movies.length === 0) {
    return (
      <p className="text-slate-500 dark:text-slate-400">
        Similar titles aren’t available right now, but we’ll show them here when TMDB provides matches.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {movies.map((item) => {
        const imageUrl = item.backdrop_path
          ? `https://image.tmdb.org/t/p/w780/${item.backdrop_path}`
          : item.poster_path
            ? `https://image.tmdb.org/t/p/w500/${item.poster_path}`
            : 'https://placehold.co/780x439?text=No+Image';

        return (
          <Link
            key={item.id}
            to={`/movies/${item.id}`}
            className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/20"
          >
            <div className="relative h-44 overflow-hidden">
              <img src={imageUrl} alt={item.title || item.original_title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
                <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">{item.release_date ? new Date(item.release_date).getFullYear() : 'New pick'}</span>
                {item.vote_average ? (
                  <span className="rounded-full bg-amber-400/90 px-3 py-1 text-xs font-semibold text-slate-950">⭐ {item.vote_average.toFixed(1)}</span>
                ) : null}
              </div>
            </div>
            <div className="space-y-3 p-4">
              <h3 className="text-lg font-semibold text-slate-900 transition group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-300">
                {item.title || item.original_title}
              </h3>
              <p className="line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {item.overview || 'Another title picked from TMDB’s similar movies feed for this film.'}
              </p>
              <span className="inline-flex items-center text-sm font-semibold text-amber-600 dark:text-amber-300">
                Open details →
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function CreditsPanel({ credits }) {
  const cast = credits?.cast || [];
  const crew = credits?.crew || [];

  if (cast.length === 0 && crew.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400">Credits aren’t available for this title right now.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Top cast</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cast.map((member) => (
            <Link
              key={`${member.cast_id || member.credit_id}-${member.id}`}
              to={`/people/${member.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/80 dark:hover:border-amber-300/40"
            >
              <div className="flex items-center gap-3">
                <img
                  src={member.profile_path ? `https://image.tmdb.org/t/p/w185/${member.profile_path}` : 'https://placehold.co/96x96?text=Cast'}
                  alt={member.name}
                  className="h-16 w-16 rounded-2xl object-cover"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{member.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{member.character}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Crew highlights</h3>
        <div className="space-y-3">
          {crew.slice(0, 6).map((member) => (
            <div key={`${member.credit_id}-${member.id}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
              <p className="font-semibold text-slate-900 dark:text-white">{member.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{member.job || member.department}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WatchProviders({ providers }) {
  if (!providers) {
    return (
      <p className="text-slate-500 dark:text-slate-400">
        Watch provider information isn’t available right now. Try checking again later.
      </p>
    );
  }

  const hasAny = (providers.flatrate && providers.flatrate.length)
    || (providers.rent && providers.rent.length)
    || (providers.buy && providers.buy.length);

  if (!hasAny) {
    return (
      <p className="text-slate-500 dark:text-slate-400">
        We couldn’t find streaming or purchase providers for this title in your region yet.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {providers.link ? (
        <a
          href={providers.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-xl bg-amber-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-amber-200"
        >
          Open provider details
        </a>
      ) : null}
      <ProviderGroup title="Stream" items={providers.flatrate} />
      <ProviderGroup title="Rent" items={providers.rent} />
      <ProviderGroup title="Buy" items={providers.buy} />
    </div>
  );
}

function TrailerPanel({ trailer }) {
  if (!trailer) {
    return (
      <p className="text-slate-500 dark:text-slate-400">
        Trailer isn’t available right now for this title.
      </p>
    );
  }

  const youtubeUrl = `https://www.youtube.com/embed/${trailer.key}`;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg dark:border-white/10">
        <div className="aspect-video w-full">
          <iframe
            title={trailer.name || 'Movie trailer'}
            src={youtubeUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{trailer.name || 'Official trailer'}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{trailer.type || 'Video'} on {trailer.site}</p>
        </div>
        <a
          href={`https://www.youtube.com/watch?v=${trailer.key}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-xl bg-red-500 px-4 py-2 font-semibold text-white transition hover:bg-red-400"
        >
          Open on YouTube
        </a>
      </div>
    </div>
  );
}

function Comments({ movieId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const { user, openLogin } = useAuth();
  const API = process.env.REACT_APP_API_URL || null;

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!API) {
        // fallback to localStorage
        try {
          const raw = window.localStorage.getItem(`comments_${movieId}`);
          const list = raw ? JSON.parse(raw) : [];
          if (mounted) setComments(Array.isArray(list) ? list : []);
        } catch (e) {
          if (mounted) setComments([]);
        }
        return;
      }
      try {
        const res = await fetch(`${API.replace(/\/$/, '')}/api/comments/${movieId}`);
        const payload = await res.json();
        if (payload && payload.ok && mounted) setComments(payload.data || []);
      } catch (e) {
        if (mounted) setComments([]);
      }
    }
    load();
    return () => (mounted = false);
  }, [movieId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedText = (text || '').trim();
    if (!trimmedText) return;
    if (!API) {
      // local fallback
      const storageKey = `comments_${movieId}`;
      try {
        const raw = window.localStorage.getItem(storageKey);
        const list = raw ? JSON.parse(raw) : [];
        const nv = { id: Date.now(), name: (user && user.name) || 'Anonymous', text: trimmedText, createdAt: new Date().toISOString() };
        const next = [nv, ...list];
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        setComments(next);
        setText('');
      } catch (e) {}
      return;
    }

    if (!user) {
      if (openLogin) openLogin();
      return;
    }

    const token = window.localStorage.getItem('ff_token');
    try {
      const res = await fetch(`${API.replace(/\/$/, '')}/api/comments/${movieId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: trimmedText }),
      });
      const payload = await res.json();
      if (payload && payload.ok && payload.comment) {
        setComments((prev) => [payload.comment, ...prev]);
        setText('');
      } else {
        // show error briefly
        alert((payload && payload.error) || 'Failed to post comment');
      }
    } catch (e) {
      alert('Failed to post comment');
    }
  };

  const remove = (id) => {
    // client-side remove available only for local fallback; server-side delete not implemented yet
    if (!API) {
      const storageKey = `comments_${movieId}`;
      const next = comments.filter((c) => c.id !== id);
      setComments(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {}
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-2 mb-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment..." className="rounded-2xl border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400 focus:border-amber-300 focus:outline-none dark:border-white/10 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-amber-300" rows={3} />
        </div>
        <div>
          <button type="submit" className="rounded-xl bg-amber-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-amber-200 dark:bg-amber-300 dark:text-slate-950">Post comment</button>
        </div>
      </form>

      <div>
        {comments.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">Be the first to comment on this movie.</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/20">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-slate-900 dark:text-white">{c.user ? c.user.username : c.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(c.createdAt).toLocaleString()}</div>
                </div>
                <div className="mb-2 text-slate-700 dark:text-slate-200">{c.text}</div>
                <div>
                  {!process.env.REACT_APP_API_URL && user && (c.name === user.name) && (
                    <button onClick={() => remove(c.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Rating({ movieId }) {
  const { user, openLogin } = useAuth();
  const [hover, setHover] = useState(0);
  const [ratings, setRatings] = useState([]);
  const [userRating, setUserRating] = useState(null);
  const [message, setMessage] = useState(null);
  const API = process.env.REACT_APP_API_URL || null;

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!API) {
        try {
          const raw = window.localStorage.getItem(`ratings_${movieId}`);
          const list = raw ? JSON.parse(raw) : [];
          if (mounted) {
            setRatings(Array.isArray(list) ? list : []);
            if (user) {
              const my = list.find((r) => r.user === user.name);
              if (my) setUserRating(Number(my.rating));
            }
          }
        } catch (e) {
          if (mounted) setRatings([]);
        }
        return;
      }
      try {
        const res = await fetch(`${API.replace(/\/$/, '')}/api/ratings/${movieId}`);
        const payload = await res.json();
        if (payload && payload.ok && mounted) {
          setRatings(payload.data.ratings || []);
          if (user) {
            const me = (payload.data.ratings || []).find((r) => r.user && r.user.username === user.name);
            if (me) setUserRating(Number(me.rating));
          }
        }
      } catch (e) {
        if (mounted) setRatings([]);
      }
    }
    load();
    return () => (mounted = false);
  }, [movieId, user]);

  const persistLocal = (next) => {
    setRatings(next);
    try {
      window.localStorage.setItem(`ratings_${movieId}`, JSON.stringify(next));
    } catch (e) {}
  };

  const handleSave = async (val) => {
    if (!user) {
      if (openLogin) openLogin();
      return;
    }
    if (!API) {
      // local fallback
      const now = new Date().toISOString();
      const existing = ratings.find((r) => r.user === user.name);
      if (existing) {
        setMessage('You have already rated this movie — ratings are locked and cannot be changed.');
        return;
      }
      const next = [{ user: user.name, rating: val, createdAt: now }, ...ratings];
      setUserRating(val);
      persistLocal(next);
      return;
    }

    const token = window.localStorage.getItem('ff_token');
    try {
      const res = await fetch(`${API.replace(/\/$/, '')}/api/ratings/${movieId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: Number(val) }),
      });
      const payload = await res.json();
      if (payload && payload.ok && payload.rating) {
        // prepend new rating
        setRatings((prev) => [payload.rating, ...prev]);
        setUserRating(Number(payload.rating.rating));
      } else {
        setMessage((payload && payload.error) || 'Failed to save rating');
      }
    } catch (e) {
      setMessage('Failed to save rating');
    }
  };

  const avg = ratings.length ? (ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length) : 0;
  const avgFmt = avg ? Math.round(avg * 10) / 10 : 0;

  const stars = [];
  for (let i = 1; i <= 10; i++) {
    const filled = hover ? i <= hover : userRating ? i <= userRating : false;
    stars.push(
      <button
        key={i}
        type="button"
        aria-label={`Rate ${i}`}
        onMouseEnter={() => setHover(i)}
        onMouseLeave={() => setHover(0)}
        onFocus={() => setHover(i)}
        onBlur={() => setHover(0)}
        onClick={() => handleSave(i)}
        className="text-xl mx-0.5"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: filled ? '#f59e0b' : '#475569' }}
      >
        {filled ? '★' : '☆'}
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center">
        <div className="flex items-center" aria-hidden>
          {stars}
        </div>
        <div className="ml-3 text-sm text-slate-700 dark:text-slate-200">
          {userRating ? (
            <span>Your rating: <strong>{userRating}</strong>/10</span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">Not rated yet</span>
          )}
        </div>
        <div className="ml-6 text-sm text-slate-600 dark:text-slate-300">Avg: <strong>{avgFmt}</strong> ({ratings.length})</div>
      </div>
      {message && <div className="mt-2 text-xs text-red-500 dark:text-red-400">{message}</div>}
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Click a star to rate (1–10). Requires signing in. Ratings are locked once submitted and cannot be changed.</div>
    </div>
  );
}

export default MoviesDetailPage;