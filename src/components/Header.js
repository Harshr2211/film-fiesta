import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Logo from "../assets/logo.png";
import tmdb from "../api/tmdb";
import { hasRecommendationProfile } from "../utils/recommendations";

const Header = () => {
  const activeMenuColor = "rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20";
  const inactiveMenuColor = "rounded-full px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white";

  const [show, setShow] = useState(false);
  const [darkMode, setDarkMode] = useState(
    JSON.parse(localStorage.getItem("darkMode")) || false
  );
  const navigate = useNavigate();
  const auth = useAuth();

  const goToForYou = () => {
    navigate(hasRecommendationProfile(auth?.user?.name) ? '/recommendations' : '/onboarding/recommendations');
    setShow(false);
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    const query = evt.target.search.value.trim();
    if (!query) return;
    try {
      await tmdb.search(query);
      navigate(`/movies/search?q=${encodeURIComponent(query)}`);
    } catch (e) {}
    evt.target.search.value = '';
  }

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));

    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto max-w-screen-xl px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center rtl:space-x-reverse">
            <img src={Logo} className="h-12" alt="FilmFiesta" />
          </Link>
          {/* Sign in button placed beside logo */}
          {!auth || !auth.user ? (
            <button
              id="signInBtn"
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-[linear-gradient(135deg,_rgba(251,191,36,0.22),_rgba(245,158,11,0.12))] px-5 py-2.5 text-sm font-semibold text-amber-50 shadow-lg shadow-amber-500/10 transition duration-200 hover:-translate-y-[1px] hover:border-amber-200/60 hover:bg-[linear-gradient(135deg,_rgba(251,191,36,0.28),_rgba(245,158,11,0.18))] hover:shadow-amber-400/20"
              onClick={() => auth && auth.openLogin ? auth.openLogin() : null}
            >
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.85)]"></span>
              Sign In
            </button>
          ) : null}
        </div>
        {/* Removed modal popup for Popular. Navigation now shows full page layout. */}
        {/* Removed modal popup for Top Rated. Navigation now shows full page layout. */}
        {/* Removed modal popup for Upcoming. Navigation now shows full page layout. */}
  <div className="flex items-center gap-3 md:order-2">
          <button
            type="button"
            data-collapse-toggle="navbar-search"
            aria-controls="navbar-search"
            aria-expanded="false"
            className="md:hidden text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-2.5 me-1"
            onClick={() => setShow(!show)}
          >
            <svg
              className="w-5 h-5"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
              />
            </svg>
            <span className="sr-only">Search</span>
          </button>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button
              className={`rounded-xl bg-white p-1.5 text-sm hover:bg-amber-100 focus:outline-none dark:hover:bg-primary-800 dark:focus:ring-gray-700 group ${
                darkMode ? "hidden" : ""
              }`}
              onClick={() => setDarkMode(true)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <path
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  className="stroke-primary-800 group-hover:stroke-white"
                ></path>
                <path
                  d="M12 4v1M17.66 6.344l-.828.828M20.005 12.004h-1M17.66 17.664l-.828-.828M12 20.01V19M6.34 17.664l.835-.836M3.995 12.004h1.01M6 6l.835.836"
                  className="stroke-primary-800 group-hover:stroke-white"
                ></path>
              </svg>
            </button>
            <button
              className={`rounded-xl bg-slate-800 p-1.5 text-sm hover:bg-slate-700 focus:outline-none dark:hover:bg-gray-50 dark:focus:ring-gray-700 group ${
                darkMode ? "" : "hidden"
              }`}
              onClick={() => setDarkMode(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M17.715 15.15A6.5 6.5 0 0 1 9 6.035C6.106 6.922 4 9.645 4 12.867c0 3.94 3.153 7.136 7.042 7.136 3.101 0 5.734-2.032 6.673-4.853Z"
                  className="fill-white group-hover:fill-primary-800"
                ></path>
                <path
                  d="m17.715 15.15.95.316a1 1 0 0 0-1.445-1.185l.495.869ZM9 6.035l.846.534a1 1 0 0 0-1.14-1.49L9 6.035Zm8.221 8.246a5.47 5.47 0 0 1-2.72.718v2a7.47 7.47 0 0 0 3.71-.98l-.99-1.738Zm-2.72.718A5.5 5.5 0 0 1 9 9.5H7a7.5 7.5 0 0 0 7.5 7.5v-2ZM9 9.5c0-1.079.31-2.082.845-2.93L8.153 5.5A7.47 7.47 0 0 0 7 9.5h2Zm-4 3.368C5 10.089 6.815 7.75 9.292 6.99L8.706 5.08C5.397 6.094 3 9.201 3 12.867h2Zm6.042 6.136C7.718 19.003 5 16.268 5 12.867H3c0 4.48 3.588 8.136 8.042 8.136v-2Zm5.725-4.17c-.81 2.433-3.074 4.17-5.725 4.17v2c3.552 0 6.553-2.327 7.622-5.537l-1.897-.632Z"
                  className="fill-white group-hover:fill-primary-800"
                ></path>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M17 3a1 1 0 0 1 1 1 2 2 0 0 0 2 2 1 1 0 1 1 0 2 2 2 0 0 0-2 2 1 1 0 1 1-2 0 2 2 0 0 0-2-2 1 1 0 1 1 0-2 2 2 0 0 0 2-2 1 1 0 0 1 1-1Z"
                  className="fill-white group-hover:fill-primary-800"
                ></path>
              </svg>
            </button>
            <div className="flex items-center md:ml-2">
              <form onSubmit={handleSubmit} className="flex items-center">
                <input
                  type="text"
                  name="search"
                  className="block w-48 rounded-2xl border border-white/10 bg-white/5 p-3 ps-10 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none md:w-64"
                  placeholder="Search movies..."
                  autoComplete="off"
                />
              </form>
            </div>
          </div>
          {/* auth area: profile menu on right when signed in */}
          <div className="flex items-center">
            <div className="nav-auth flex items-center gap-3">
              {auth && auth.user ? (
                <>
                  <ProfileMenu auth={auth} />
                  <button
                    className="signout-btn rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                    onClick={() => auth.logout && auth.logout()}
                  >
                    Sign Out
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <button
            data-collapse-toggle="navbar-search"
            type="button"
            className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
            aria-controls="navbar-search"
            aria-expanded="false"
            onClick={() => setShow(!show)}
          >
            <span className="sr-only">Open main menu</span>
            <svg
              className="w-5 h-5"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 17 14"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M1 1h15M1 7h15M1 13h15"
              />
            </svg>
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-base font-semibold text-yellow-400">
          <NavLink
            to="/movies/popular"
            className={({ isActive }) => isActive ? activeMenuColor : inactiveMenuColor}
            onClick={() => setShow(false)}
          >
            Popular
          </NavLink>
          <NavLink
            to="/movies/top_rated"
            className={({ isActive }) => isActive ? activeMenuColor : inactiveMenuColor}
            onClick={() => setShow(false)}
          >
            Top Rated
          </NavLink>
          <NavLink
            to="/movies/upcoming"
            className={({ isActive }) => isActive ? activeMenuColor : inactiveMenuColor}
            onClick={() => setShow(false)}
          >
            Upcoming
          </NavLink>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-300 to-yellow-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:scale-[1.03] hover:shadow-amber-500/35"
            onClick={goToForYou}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-white animate-pulse"></span>
            Personalized
          </button>
        </div>
        <div
          className={`items-center justify-between w-full md:flex md:w-auto md:order-1 ${
            show ? "" : "hidden"
          }`}
          id="navbar-search"
        >
          <div className="relative mt-3 md:hidden">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                />
              </svg>
            </div>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="search"
                className="block w-full rounded-lg border border-amber-200/20 bg-[#1a1328] p-2 ps-10 text-lg text-white focus:border-amber-300 focus:ring-amber-300 dark:border-amber-200/10 dark:bg-[#120c1d] dark:placeholder-gray-400 dark:text-white dark:focus:border-amber-300 dark:focus:ring-amber-300"
                placeholder="Search movies..."
                autoComplete="off"
              />
            </form>
          </div>
          <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium border border-gray-100 rounded-lg bg-white-50 md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? activeMenuColor : inactiveMenuColor
                }
                onClick={() => setShow(false)}
              >
                Home
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/movies/popular"
                className={({ isActive }) =>
                  isActive ? activeMenuColor : inactiveMenuColor
                }
                onClick={() => setShow(false)}
              >
                Popular
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/movies/top_rated"
                className={({ isActive }) =>
                  isActive ? activeMenuColor : inactiveMenuColor
                }
                onClick={() => setShow(false)}
              >
                Top Rated
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/movies/upcoming"
                className={({ isActive }) =>
                  isActive ? activeMenuColor : inactiveMenuColor
                }
                onClick={() => setShow(false)}
              >
                Upcoming
              </NavLink>
            </li>
            <li>
              <button
                type="button"
                onClick={goToForYou}
                className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-gradient-to-r from-[#2b2011] to-[#eab308] px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-amber-900/20 transition hover:scale-[1.03] hover:shadow-amber-500/30"
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-white animate-pulse"></span>
                For You Today
              </button>
            </li>
          </ul>
        </div>
      </div>
      </div>
    </nav>
  );
};

export default Header;

function ProfileMenu({ auth }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const username = auth && auth.user ? auth.user.name : '';
  const initial = username ? String(username).trim().charAt(0).toUpperCase() : 'U';

  const handleLogout = () => {
    setOpen(false);
    if (auth && auth.logout) auth.logout();
  };

  const goToProfile = () => {
    setOpen(false);
    navigate('/profile');
  };

  return (
    <div className={`profile ${open ? '' : 'hidden'}`} id="profileMenu" ref={ref} style={{ position: 'relative' }}>
      <div id="avatarCircle" className="avatar cursor-pointer bg-primary-800 text-white rounded-full w-8 h-8 flex items-center justify-center" onClick={() => setOpen((v) => !v)}>{initial}</div>
      <div id="dropdownMenu" className={`dropdown ${open ? '' : 'hidden'} absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl py-2 backdrop-blur-xl`}>
        <button type="button" className="w-full px-4 py-3 text-left text-sm text-gray-100 transition hover:bg-white/5" onClick={goToProfile}>My Profile & Lists</button>
        <button type="button" className="w-full px-4 py-3 text-left text-sm text-gray-100 transition hover:bg-white/5" onClick={() => { setOpen(false); navigate('/recommendations'); }}>My Recommendations</button>
        <p className="dropdown-item logout px-4 py-2 text-sm text-red-400 cursor-pointer" onClick={handleLogout}>Logout</p>
      </div>
    </div>
  );
}
