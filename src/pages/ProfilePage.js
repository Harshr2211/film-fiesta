import React, { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRecommendationProfile, hasRecommendationProfile } from '../utils/recommendations';
import {
  getSavedMovies,
  removeSavedMovie,
  updateUserPreferences,
  updateUserProfile,
} from '../utils/userData';
import useDynamicTitle from '../hooks/useDynamicTitle';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'watched', label: 'Watched' },
  { id: 'recent', label: 'Recently Viewed' },
  { id: 'settings', label: 'Settings' },
];

export default function ProfilePage() {
  useDynamicTitle('My Profile | FilmFiesta');
  const auth = useAuth();
  const user = auth?.user;
  const [activeSection, setActiveSection] = useState('overview');
  const [showSaved, setShowSaved] = useState(false);

  const username = user?.name;
  const profile = auth?.profile || {};
  const preferences = auth?.preferences || {};
  const stats = auth?.stats || {};
  const recommendationProfile = useMemo(() => getRecommendationProfile(username), [username]);

  const watchlist = getSavedMovies(username, 'watchlist');
  const favorites = getSavedMovies(username, 'favorites');
  const watched = getSavedMovies(username, 'watched');
  const recent = getSavedMovies(username, 'recent');
  const removeFromSection = (section, movieId) => {
    removeSavedMovie(username, section, movieId);
    auth?.refreshUserMeta?.();
    auth?.notify?.({ type: 'success', title: 'List updated', message: `Removed item from your ${section}.` });
  };

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const updateAccent = (themeAccent) => {
    updateUserPreferences(username, { themeAccent });
    auth?.savePreferences?.({ themeAccent });
    auth?.notify?.({ type: 'success', title: 'Theme updated', message: `Accent theme switched to ${themeAccent}.` });
  };

  const updateTagline = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tagline = String(form.get('tagline') || '').trim();
    const bio = String(form.get('bio') || '').trim();
    updateUserProfile(username, { tagline, bio });
    auth?.saveProfile?.({ tagline, bio });
    auth?.notify?.({ type: 'success', title: 'Profile updated', message: 'Your profile details were saved.' });
  };

  return (
  <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(231,196,106,0.14),_transparent_20%),_linear-gradient(180deg,_#08060d_0%,_#100b17_45%,_#0a0712_100%)] px-4 py-8 text-white md:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-28 h-fit rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="rounded-[28px] border border-amber-300/15 bg-[linear-gradient(180deg,_rgba(29,21,11,0.95),_rgba(14,10,6,0.95))] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-2xl font-black text-slate-950">
                {String(username).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-amber-200">Movie profile</p>
                <h1 className="mt-1 text-2xl font-bold">{username}</h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">{profile.tagline || 'Curating the next great movie night.'}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <StatPill label="Watchlist" value={stats.watchlistCount || 0} />
            <StatPill label="Favorites" value={stats.favoritesCount || 0} />
            <StatPill label="Watched" value={stats.watchedCount || 0} />
          </div>

          <nav className="mt-6 space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${activeSection === section.id ? 'bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}
              >
                {section.label}
              </button>
            ))}
          </nav>

          <Link
            to={hasRecommendationProfile(username) ? '/recommendations' : '/onboarding/recommendations'}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20"
          >
            Open my recommendations
          </Link>
        </aside>

        <section className="space-y-6">
          {activeSection === 'overview' ? (
            <>
              <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-amber-200">Your movie lounge</p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight">Everything you saved, loved, and watched</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                      This is your private dashboard for quick access to watchlist picks, favorites, watched titles, recent visits, and personalized settings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSaved((prev) => !prev)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {showSaved ? 'Hide quick picks' : 'Show quick picks'}
                  </button>
                </div>
              </div>

              {showSaved ? (
                <div className="grid gap-6 xl:grid-cols-3">
                  <QuickListCard title="Watchlist" items={watchlist} accent="violet" />
                  <QuickListCard title="Favorites" items={favorites} accent="rose" />
                  <QuickListCard title="Recently Viewed" items={recent} accent="indigo" />
                </div>
              ) : null}

              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
                  <h3 className="text-xl font-semibold">Taste profile</h3>
                  {recommendationProfile ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {Object.entries(recommendationProfile).map(([key, value]) => (
                        <span key={key} className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm capitalize text-amber-100">
                          {key}: {String(value).replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-300">You haven’t completed your recommendation quiz yet.</p>
                  )}
                </div>

                <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
                  <h3 className="text-xl font-semibold">Current settings</h3>
                  <div className="mt-5 grid gap-4 text-sm text-slate-300">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Accent theme: <strong className="ml-1 capitalize text-white">{preferences.themeAccent || 'gold'}</strong></div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Preferred region: <strong className="ml-1 uppercase text-white">{preferences.preferredRegion || 'IN'}</strong></div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Autoplay trailers: <strong className="ml-1 text-white">{preferences.autoplayTrailers ? 'On' : 'Off'}</strong></div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activeSection === 'watchlist' ? <MovieSection title="Your watchlist" items={watchlist} section="watchlist" onRemove={removeFromSection} emptyLabel="You haven’t added any movies to your watchlist yet." /> : null}
          {activeSection === 'favorites' ? <MovieSection title="Your favorites" items={favorites} section="favorites" onRemove={removeFromSection} emptyLabel="No favorites yet — tap the heart on any movie card to start curating." /> : null}
          {activeSection === 'watched' ? <MovieSection title="Watched movies" items={watched} section="watched" onRemove={removeFromSection} emptyLabel="Mark movies as watched from the details page to build your history." /> : null}
          {activeSection === 'recent' ? <MovieSection title="Recently viewed" items={recent} section="recent" onRemove={removeFromSection} emptyLabel="Movies you open will show up here for quick return access." /> : null}

          {activeSection === 'settings' ? (
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <h3 className="text-xl font-semibold">Theme accent</h3>
                <div className="mt-5 grid gap-3">
                  {['gold', 'amber', 'rose'].map((accent) => (
                    <button
                      key={accent}
                      type="button"
                      onClick={() => updateAccent(accent)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold capitalize transition ${preferences.themeAccent === accent ? 'border-amber-300 bg-amber-300/15 text-amber-50' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
                    >
                      {accent}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={updateTagline} className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <h3 className="text-xl font-semibold">Profile details</h3>
                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2 text-sm text-slate-300">
                    Tagline
                    <input name="tagline" defaultValue={profile.tagline || ''} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-300" />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-300">
                    Bio
                    <textarea name="bio" rows={4} defaultValue={profile.bio || ''} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-300" />
                  </label>
                </div>
                <button type="submit" className="mt-5 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20">
                  Save profile updates
                </button>
              </form>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
      <span className="block text-xs uppercase tracking-[0.24em] text-slate-400">{label}</span>
      <span className="mt-1 block text-lg font-bold text-white">{value}</span>
    </div>
  );
}

function QuickListCard({ title, items, accent }) {
  const accentMap = {
  gold: 'from-amber-300/25 to-yellow-500/10 text-amber-50',
    rose: 'from-rose-500/25 to-orange-400/10 text-rose-50',
  amber: 'from-yellow-500/25 to-amber-300/10 text-amber-50',
  };

  return (
    <div className={`rounded-[30px] border border-white/10 bg-gradient-to-br ${accentMap[accent]} p-5 shadow-2xl shadow-black/20`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.slice(0, 3).map((item) => (
          <Link key={item.id} to={`/movies/${item.id}`} className="block rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/90 transition hover:bg-black/25">
            {item.title}
          </Link>
        ))}
        {items.length === 0 ? <p className="text-sm text-white/75">Nothing here yet.</p> : null}
      </div>
    </div>
  );
}

function MovieSection({ title, items, emptyLabel, section, onRemove }) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-2xl font-semibold">{title}</h3>
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">{items.length} saved</span>
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-white/[0.04] px-5 py-6 text-center">
          <p className="text-sm leading-7 text-slate-300">{emptyLabel}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-[26px] border border-white/10 bg-white/5 shadow-lg shadow-black/10 transition hover:-translate-y-1 hover:bg-white/10"
            >
              <Link to={`/movies/${item.id}`}>
              <div className="relative h-44 overflow-hidden">
                <img
                  src={item.backdrop_path ? `https://image.tmdb.org/t/p/w780/${item.backdrop_path}` : item.poster_path ? `https://image.tmdb.org/t/p/w500/${item.poster_path}` : 'https://placehold.co/780x439?text=No+Image'}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
              </div>
              <div className="space-y-2 p-4">
                <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                <p className="line-clamp-3 text-sm leading-6 text-slate-300">{item.overview || 'Saved for your next movie night.'}</p>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span>{item.release_date ? item.release_date.slice(0, 4) : 'Film'}</span>
                  <span>{item.original_language || 'movie'}</span>
                </div>
              </div>
              </Link>
              <div className="border-t border-white/10 px-4 py-3">
                <button
                  type="button"
                  onClick={() => onRemove?.(section, item.id)}
                  className="text-sm font-semibold text-rose-300 transition hover:text-rose-200"
                >
                  Remove from {section}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
