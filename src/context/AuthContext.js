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

async function parseJSON(res) {
  const t = await res.text();

  const raw = String(t || '');
  const normalized = raw.trim().toLowerCase();
  if (normalized.startsWith('<!doctype') || normalized.startsWith('<html') || normalized.includes('<title>inactivity timeout</title>')) {
    return {
      ok: false,
      error:
        'Server request timed out before responding. Check Netlify function logs and verify MONGO_URI/CORS_ORIGIN are correct.',
    };
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: raw || 'Unexpected server response' };
  }
}

function isTimeoutLikeError(payload) {
  const msg = String(payload?.error || '').toLowerCase();
  return msg.includes('timed out') || msg.includes('inactivity timeout');
}

async function fetchApiJson(path, init = {}) {
  const primaryUrl = resolveApiUrl(path);
  const fallbackUrl = path;
  const urls = primaryUrl === fallbackUrl ? [primaryUrl] : [primaryUrl, fallbackUrl];

  let lastPayload = { ok: false, error: 'Request failed' };
  for (let i = 0; i < urls.length; i += 1) {
    try {
      const res = await fetch(urls[i], init);
      const payload = await parseJSON(res);
      if (!isTimeoutLikeError(payload) || i === urls.length - 1) {
        return payload;
      }
      lastPayload = payload;
    } catch (e) {
      lastPayload = { ok: false, error: e?.message || 'Network request failed' };
      if (i === urls.length - 1) return lastPayload;
    }
  }

  return lastPayload;
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
      fetchApiJson('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
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
    const payload = await fetchApiJson('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });
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
    const payload = await fetchApiJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
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
    const payload = await fetchApiJson('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!payload.ok) throw new Error(payload.error || 'Failed to request reset');
    // payload may include token for dev
    return { username: payload.username, token: payload.token };
  }

  async function resetPassword({ username, token, newPassword }) {
    const payload = await fetchApiJson('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, token, newPassword }),
    });
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
