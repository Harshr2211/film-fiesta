import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import renderSkeletons from '../components/skeleton';
import MovieCard from '../components/MovieCard';
import useDynamicTitle from '../hooks/useDynamicTitle';
import tmdb from '../api/tmdb';

const SearchPage = ({ apiPath }) => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [movies, setMovies] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('relevance');

  useDynamicTitle(`Search Results For: ${query}`);

  useEffect(() => {
    if (!query) return;
    let mounted = true;
    setIsLoading(true);
    setError(null);
    tmdb
      .search(query, 1)
      .then((data) => {
        if (!mounted) return;
        setMovies(data);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Search failed');
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [query]);

  const visibleMovies = [...(movies?.results || [])].sort((a, b) => {
    if (sortBy === 'rating') return Number(b.vote_average || 0) - Number(a.vote_average || 0);
    if (sortBy === 'newest') return new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime();
    return 0;
  });

  return (
    <div className="px-4 pt-6 pb-8">
      <div className="mx-auto max-w-[1400px]">
  <div className="mb-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(18,12,29,0.98),_rgba(10,7,18,0.94))] p-5 text-white shadow-[0_26px_60px_rgba(2,6,23,0.36)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-amber-200">Search</p>
              <h2 className="text-4xl font-black tracking-tight text-[#f5f1ff]">Results for: {query}</h2>
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#f5f1ff] outline-none focus:border-amber-300">
              <option value="relevance">Best match</option>
              <option value="rating">Highest rated</option>
              <option value="newest">Newest first</option>
            </select>
          </div>
        </div>

      <div className="flex flex-wrap max-md:justify-evenly">
        {error && <p className="text-red-500">Some issue in searching your data: {error}</p>}
        {isLoading && renderSkeletons(6)}
        {movies && movies.results && movies.results.length === 0 && (
          <p className='dark:text-white'>No movies found for your keyword</p>
        )}
        {visibleMovies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
      </div>
    </div>
  );
};

export default SearchPage;