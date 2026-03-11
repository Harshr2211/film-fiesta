import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import tmdb from '../api/tmdb';
import useDynamicTitle from '../hooks/useDynamicTitle';

export default function PersonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [credits, setCredits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    Promise.all([tmdb.getPerson(id), tmdb.getPersonMovieCredits(id)])
      .then(([personData, creditData]) => {
        if (!mounted) return;
        setPerson(personData || null);
        const sortedCredits = [...(creditData?.cast || [])]
          .sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0))
          .slice(0, 8);
        setCredits(sortedCredits);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load person details');
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  useDynamicTitle(person ? `${person.name} | FilmFiesta` : 'Cast Details | FilmFiesta');

  const age = useMemo(() => {
    if (!person?.birthday) return null;
    const birth = new Date(person.birthday);
    const end = person.deathday ? new Date(person.deathday) : new Date();
    let years = end.getFullYear() - birth.getFullYear();
    const monthDiff = end.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) years -= 1;
    return years;
  }, [person]);

  if (isLoading) return <div className="min-h-screen bg-[#0a0712] px-6 py-8 text-white">Loading cast details...</div>;
  if (error) return <div className="min-h-screen bg-[#0a0712] px-6 py-8 text-red-400">Error: {error}</div>;
  if (!person) return <div className="min-h-screen bg-[#0a0712] px-6 py-8 text-white">No cast member found.</div>;

  const profileImage = person.profile_path
    ? `https://image.tmdb.org/t/p/w500/${person.profile_path}`
    : 'https://placehold.co/500x750?text=Person';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(231,196,106,0.14),_transparent_24%),_linear-gradient(180deg,_#08060d_0%,_#100b17_45%,_#0a0712_100%)] px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-amber-200 transition hover:border-amber-300 hover:bg-white/10"
        >
          ← Back
        </button>

        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] shadow-[0_30px_80px_rgba(2,6,23,0.4)] backdrop-blur-sm">
          <div className="grid gap-8 p-6 md:grid-cols-[320px_minmax(0,1fr)] md:p-10">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
              <img src={profileImage} alt={person.name} className="h-full w-full object-cover" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-200">Cast details</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">{person.name}</h1>

              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-200">
                {person.known_for_department ? <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">🎬 {person.known_for_department}</span> : null}
                {age ? <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">🎂 {age} years</span> : null}
                {person.place_of_birth ? <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">📍 {person.place_of_birth}</span> : null}
              </div>

              <div className="mt-6 rounded-[28px] border border-amber-300/15 bg-amber-300/5 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-amber-200">Biography</p>
                <p className="mt-3 text-sm leading-8 text-slate-300">
                  {person.biography || 'Biography is not available for this person yet on TMDB.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.3)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-amber-200">Filmography highlights</p>
              <h2 className="mt-2 text-2xl font-bold">Popular movies featuring {person.name}</h2>
            </div>
          </div>

          {credits.length === 0 ? (
            <p className="mt-6 text-sm text-slate-300">No movie credits are available right now.</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {credits.map((credit) => {
                const imageUrl = credit.poster_path
                  ? `https://image.tmdb.org/t/p/w500/${credit.poster_path}`
                  : 'https://placehold.co/500x750?text=Movie';

                return (
                  <Link
                    key={`${credit.id}-${credit.credit_id || credit.character || 'credit'}`}
                    to={`/movies/${credit.id}`}
                    className="group overflow-hidden rounded-[26px] border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:bg-white/10"
                  >
                    <div className="relative h-72 overflow-hidden">
                      <img src={imageUrl} alt={credit.title || credit.original_title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                    </div>
                    <div className="space-y-2 p-4">
                      <h3 className="text-lg font-semibold text-white">{credit.title || credit.original_title}</h3>
                      <p className="text-sm text-slate-300">{credit.character ? `as ${credit.character}` : 'Movie credit'}</p>
                      <span className="inline-flex items-center text-sm font-semibold text-amber-200">Open movie →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}