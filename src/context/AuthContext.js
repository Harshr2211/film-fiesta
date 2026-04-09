import React, { createContext, useContext, useEffect, useState } from 'react';
import { clearRecommendationProfile } from '../utils/recommendations';
import {
  getNotifications,
  getProfileStats,
  getUserPreferences,
  getUserProfile,
  pushNotification,
  removeNotification,
  updateUserPreferences,
  updateUserProfile,
} from '../utils/userData';
import { API_BASE, resolveApiUrl } from '../utils/apiUrl';

const AuthContext = createContext(null);

const API = API_BASE;

function ensureApiConfigured() {
  if (!API) {
    throw new Error('Authentication backend is not configured. Set REACT_APP_API_URL to /api and redeploy.');
  }
}

async function parseJSON(res) {
  const t = await res.text();
  try {
    return JSON.parse(t);
  } catch (e) {
    return { ok: false, error: t };
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [preferences, setPreferences] = useState(getUserPreferences());
  const [profile, setProfile] = useState(getUserProfile());
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Always validate persisted token against server
    const token = window.localStorage.getItem('ff_token');
    if (!API) return;

    if (token) {
      // validate token with /api/auth/me
  fetch(resolveApiUrl('/api/auth/me'), { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => parseJSON(r))
        .then((payload) => {
          if (payload && payload.ok && payload.user) {
            setUser(payload.user);
            window.localStorage.setItem('ff_user', JSON.stringify(payload.user));
          } else {
            setUser(null);
            window.localStorage.removeItem('ff_token');
            window.localStorage.removeItem('ff_user');
          }
        })
        .catch(() => {
          setUser(null);
          window.localStorage.removeItem('ff_token');
          window.localStorage.removeItem('ff_user');
        });
    }
  }, []);

  useEffect(() => {
    const username = user?.name;
    setPreferences(getUserPreferences(username));
    setProfile(getUserProfile(username));
    setNotifications(getNotifications(username));
  }, [user?.name]);

  async function signup({ username, password, email }) {
    ensureApiConfigured();

    // server flow
  const res = await fetch(resolveApiUrl('/api/auth/signup'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });
    const payload = await parseJSON(res);
    if (!payload.ok) throw new Error(payload.error || 'Signup failed');
    if (payload.token) window.localStorage.setItem('ff_token', payload.token);
    if (payload.user) window.localStorage.setItem('ff_user', JSON.stringify(payload.user));
    clearRecommendationProfile(username);
    setUser(payload.user || { name: username });
    setNotifications(pushNotification(username, {
      type: 'success',
      title: 'Welcome to FilmFiesta',
      message: 'Your account is ready. Let’s build your perfect movie vibe.',
    }));
    setShowLogin(false);
    return payload.user;
  }

  async function login({ username, password }) {
    ensureApiConfigured();

  const res = await fetch(resolveApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const payload = await parseJSON(res);
    if (!payload.ok) throw new Error(payload.error || 'Login failed');
    if (payload.token) window.localStorage.setItem('ff_token', payload.token);
    if (payload.user) window.localStorage.setItem('ff_user', JSON.stringify(payload.user));
    setUser(payload.user || { name: username });
    setNotifications(pushNotification(username, {
      type: 'success',
      title: 'Signed in',
      message: 'Welcome back — your movie lounge is ready.',
    }));
    setShowLogin(false);
    return payload.user;
  }

  function logout() {
    try {
      window.localStorage.removeItem('ff_user');
      window.localStorage.removeItem('ff_token');
    } catch (e) {}
    setUser(null);
    setNotifications([]);
  }

  function refreshUserMeta() {
    const username = user?.name;
    setPreferences(getUserPreferences(username));
    setProfile(getUserProfile(username));
    setNotifications(getNotifications(username));
  }

  function savePreferences(patch) {
    const username = user?.name;
    const next = updateUserPreferences(username, patch);
    setPreferences(next);
    return next;
  }

  function saveProfile(patch) {
    const username = user?.name;
    const next = updateUserProfile(username, patch);
    setProfile(next);
    return next;
  }

  function notify(notification) {
    const username = user?.name;
    const next = pushNotification(username, notification);
    setNotifications(next);
    return next;
  }

  function dismissNotification(notificationId) {
    const username = user?.name;
    const next = removeNotification(username, notificationId);
    setNotifications(next);
    return next;
  }

  const stats = getProfileStats(user?.name);

  function openLogin() {
    setShowLogin(true);
  }
  function closeLogin() {
    setShowLogin(false);
  }

  async function forgotPassword(email) {
    ensureApiConfigured();

  const res = await fetch(resolveApiUrl('/api/auth/forgot'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const payload = await parseJSON(res);
    if (!payload.ok) throw new Error(payload.error || 'Failed to request reset');
    // payload may include token for dev
    return { username: payload.username, token: payload.token };
  }

  async function resetPassword({ username, token, newPassword }) {
    ensureApiConfigured();

  const res = await fetch(resolveApiUrl('/api/auth/reset'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, token, newPassword }),
    });
    const payload = await parseJSON(res);
    if (!payload.ok) throw new Error(payload.error || 'Reset failed');
    return true;
  }

  return (
    <AuthContext.Provider value={{
      user,
      signup,
      login,
      logout,
      openLogin,
      closeLogin,
      showLogin,
      forgotPassword,
      resetPassword,
      preferences,
      profile,
      notifications,
      stats,
      savePreferences,
      saveProfile,
      notify,
      dismissNotification,
      refreshUserMeta,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
