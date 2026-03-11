import React, { useEffect, useState } from 'react';
import MovieCard from '../components/MovieCard';
import renderSkeletons from '../components/skeleton';
import useDynamicTitle from '../hooks/useDynamicTitle';
import tmdb from '../api/tmdb';

const TopRatedPage = () => {
  const [movies, setMovies] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useDynamicTitle('Top Rated | FilmFiesta');

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);
    tmdb.getTopRated(1)
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
    return () => { mounted = false; };
  }, []);

  return (
    <div className="flex flex-wrap max-md:justify-evenly px-4 py-8 mx-auto" style={{maxWidth: '1400px'}}>
      {isLoading && renderSkeletons(6)}
      {error && <p className="text-red-500">Error: {error}</p>}
      {movies && movies.results && movies.results.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
};

export default TopRatedPage;
