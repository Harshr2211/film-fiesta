import React, { useEffect, useState } from 'react';
import MovieCard from '../components/MovieCard';
import renderSkeletons from '../components/skeleton';
import useDynamicTitle from '../hooks/useDynamicTitle';
import tmdb from '../api/tmdb';

const MoviesListPage = ({ apiPath, title }) => {
  const [movies, setMovies] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('default');
  const [language, setLanguage] = useState('all');
  const [minimumRating, setMinimumRating] = useState(0);

  useDynamicTitle(title);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);
    tmdb
      .getList(apiPath.replace(/^\//, ''), 1)
      .then((data) => {
        if (!mounted) return;
        setMovies(data);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load movies');
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [apiPath]);

  const visibleMovies = (movies?.results || [])
    .filter((movie) => (language === 'all' ? true : movie.original_language === language))
    .filter((movie) => Number(movie.vote_average || 0) >= minimumRating)
    .sort((a, b) => {
      if (sortBy === 'rating') return Number(b.vote_average || 0) - Number(a.vote_average || 0);
      if (sortBy === 'newest') return new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime();
      if (sortBy === 'title') return String(a.title || a.original_title).localeCompare(String(b.title || b.original_title));
      return 0;
    });

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
  <div className="mb-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(18,12,29,0.98),_rgba(10,7,18,0.94))] p-5 text-white shadow-[0_26px_60px_rgba(2,6,23,0.36)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-amber-200">Browse collection</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#f5f1ff]">Explore titles your way</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#f5f1ff] outline-none focus:border-amber-300">
              <option value="default">Sort: default</option>
              <option value="rating">Highest rated</option>
              <option value="newest">Newest first</option>
              <option value="title">Alphabetical</option>
            </select>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#f5f1ff] outline-none focus:border-amber-300">
              <option value="all">Language: all</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ko">Korean</option>
              <option value="ja">Japanese</option>
            </select>
            <select value={minimumRating} onChange={(e) => setMinimumRating(Number(e.target.value))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#f5f1ff] outline-none focus:border-amber-300">
              <option value={0}>Any rating</option>
              <option value={6}>6+</option>
              <option value={7}>7+</option>
              <option value={8}>8+</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap max-md:justify-evenly">
        {isLoading && renderSkeletons(6)}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!isLoading && !error && visibleMovies.length === 0 ? (
          <p className="px-2 text-slate-500 dark:text-slate-300">No movies match your current filters.</p>
        ) : null}
        {visibleMovies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
};

export default MoviesListPage;