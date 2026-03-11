import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { isMovieSaved, toggleSavedMovie } from '../utils/userData';

const MovieCard = ({ movie }) => {
  const auth = useAuth();
  const username = auth?.user?.name;
  const imageUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/w500/${movie.backdrop_path}` : "https://placehold.co/382x241?text=No+Image";
  const inWatchlist = isMovieSaved(username, 'watchlist', movie.id);
  const inFavorites = isMovieSaved(username, 'favorites', movie.id);

  const handleToggle = (event, section) => {
    event.preventDefault();
    event.stopPropagation();
    if (!auth?.user) {
      auth?.openLogin?.();
      return;
    }
    const result = toggleSavedMovie(username, section, movie);
    auth?.refreshUserMeta?.();
    auth?.notify?.({
      type: 'success',
      title: result.saved ? 'Saved to your list' : 'Removed from your list',
      message: `${movie.title || movie.original_title} ${result.saved ? 'is now in' : 'was removed from'} your ${section}.`,
    });
  };

  return (
  <div className="group m-2 w-full max-w-sm overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(148,163,184,0.22)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(245,158,11,0.18)] dark:border-white/10 dark:bg-slate-900/85 dark:shadow-black/25">
      <Link to={`/movies/${(movie.id)}`} className="block">
      <div className="relative overflow-hidden">
        <img
          className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
          src={imageUrl}
          alt={movie.title || movie.original_title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
          <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            {movie.release_date ? new Date(movie.release_date).getFullYear() : 'Featured'}
          </span>
          {movie.vote_average ? (
            <span className="rounded-full bg-amber-400/90 px-3 py-1 text-xs font-semibold text-slate-950">⭐ {Number(movie.vote_average).toFixed(1)}</span>
          ) : null}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:transition md:duration-300 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={(event) => handleToggle(event, 'watchlist')}
            className={`rounded-full px-3 py-2 text-xs font-semibold backdrop-blur-md transition ${inWatchlist ? 'bg-emerald-400 text-slate-950' : 'border border-white/20 bg-black/35 text-white'}`}
          >
            {inWatchlist ? 'In Watchlist' : '+ Watchlist'}
          </button>
          <button
            type="button"
            onClick={(event) => handleToggle(event, 'favorites')}
            className={`rounded-full px-3 py-2 text-xs font-semibold backdrop-blur-md transition ${inFavorites ? 'bg-rose-400 text-slate-950' : 'border border-white/20 bg-black/35 text-white'}`}
          >
            {inFavorites ? 'Favorited' : '♥ Favorite'}
          </button>
        </div>
      </div>
      </Link>
      <div className="p-5">
        <Link to={`/movies/${(movie.id)}`} >
          <h5 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {movie.title || movie.original_title}
          </h5>
        </Link>
        <p className="mb-4 min-h-[72px] font-normal leading-7 text-slate-600 dark:text-slate-300">
          {(movie.overview || 'A standout pick waiting for your next movie night.').substring(0, 120)}...
        </p>
        <div className="flex items-center justify-between gap-3">
          <Link
            to={`/movies/${movie.id}`}
            className="inline-flex items-center rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:translate-y-[-1px]"
          >
            Explore details
            <svg
              className="ms-2 h-3.5 w-3.5 rtl:rotate-180"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 10"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M1 5h12m0 0L9 1m4 4L9 9"
              />
            </svg>
          </Link>
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
            {movie.original_language || 'movie'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
