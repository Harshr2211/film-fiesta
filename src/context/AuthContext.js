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

function isLocalhostRuntime() {
  if (typeof window === 'undefined') return false;
  const host = String(window.location.hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
}

function getLocalUsers() {
  try {
    const raw = window.localStorage.getItem('ff_users');
    const users = raw ? JSON.parse(raw) : [];
    return Array.isArray(users) ? users : [];
  } catch (e) {
    return [];
  }
}

function saveLocalUsers(users) {
  window.localStorage.setItem('ff_users', JSON.stringify(Array.isArray(users) ? users : []));
}

async function hashPasswordLocal(password) {
  if (!password || typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) return String(password || '');
  const enc = new TextEncoder().encode(String(password));
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function shouldUseLocalFallback(payload) {
  if (!isLocalhostRuntime()) return false;
  const code = String(payload?.code || '').toUpperCase();
  const msg = String(payload?.error || '').toLowerCase();
  return (
    code === 'DB_NOT_CONFIGURED'
    || code === 'DB_UNAVAILABLE'
    || code === 'CORS_BLOCKED'
    || msg.includes('timed out')
    || msg.includes('network request failed')
    || msg.includes('failed to fetch')
  );
}

async function localSignupFallback({ username, password, email }) {
  const name = String(username || '').trim();
  const mail = String(email || '').trim().toLowerCase();
  if (!name || !password) throw new Error('username and password required');
  const users = getLocalUsers();
  const exists = users.find((u) => u.username === name || (mail && u.email === mail));
  if (exists) throw new Error('User or email already exists');
  const passwordHash = await hashPasswordLocal(password);
  users.push({ username: name, email: mail || null, passwordHash });
  saveLocalUsers(users);
  return { ok: true, user: { name } };
}

async function localLoginFallback({ username, password }) {
  const identifier = String(username || '').trim();
  const users = getLocalUsers();
  const candidate = users.find((u) => u.username === identifier || String(u.email || '').toLowerCase() === identifier.toLowerCase());
  if (!candidate) throw new Error('User not found');
  const passwordHash = await hashPasswordLocal(password);
  if (candidate.passwordHash !== passwordHash) throw new Error('Invalid credentials');
  return { ok: true, user: { name: candidate.username } };
}

async function localForgotFallback(email) {
  const mail = String(email || '').trim().toLowerCase();
  const users = getLocalUsers();
  const candidate = users.find((u) => String(u.email || '').toLowerCase() === mail);
  if (!candidate) throw new Error('No account with that email');
  const token = Math.random().toString(36).slice(2, 10);
  window.localStorage.setItem(`ff_reset_${candidate.username}`, JSON.stringify({ token, createdAt: Date.now() }));
  return { username: candidate.username, token };
}

async function localResetFallback({ username, token, newPassword }) {
  const key = `ff_reset_${username}`;
  const raw = window.localStorage.getItem(key);
  if (!raw) throw new Error('No reset request');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error('Invalid token');
  }
  if (!parsed || parsed.token !== token) throw new Error('Invalid token');
  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.username === username);
  if (idx < 0) throw new Error('User not found');
  users[idx].passwordHash = await hashPasswordLocal(newPassword);
  saveLocalUsers(users);
  window.localStorage.removeItem(key);
  return true;
}

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

function isDefinitiveDbError(payload) {
  const code = String(payload?.code || '').toUpperCase();
  return code === 'DB_NOT_CONFIGURED' || code === 'DB_UNAVAILABLE' || code === 'CORS_BLOCKED';
}

async function fetchApiJson(path, init = {}) {
  const primaryUrl = resolveApiUrl(path);
  const fallbackUrl = path;
  const isApiPath = String(path).startsWith('/api/');
  const localDirectUrl = isApiPath ? `http://localhost:4000/api${path.slice(4)}` : null;
  const urls = [primaryUrl, fallbackUrl, localDirectUrl].filter(Boolean).filter((url, idx, arr) => arr.indexOf(url) === idx);

  let lastPayload = { ok: false, error: 'Request failed' };
  for (let i = 0; i < urls.length; i += 1) {
    try {
      const res = await fetch(urls[i], init);
      const payload = await parseJSON(res);
      if (isDefinitiveDbError(payload)) {
        return payload;
      }
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
    const localUserRaw = window.localStorage.getItem('ff_user');
    if (!API) {
      if (isLocalhostRuntime() && localUserRaw) {
        try {
          setUser(JSON.parse(localUserRaw));
        } catch (e) {}
      }
      return;
    }

    if (token) {
      // validate token with /api/auth/me
      fetchApiJson('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((payload) => {
          if (payload && payload.ok && payload.user) {
            setUser(payload.user);
            window.localStorage.setItem('ff_user', JSON.stringify(payload.user));
          } else if (isLocalhostRuntime() && localUserRaw) {
            try {
              setUser(JSON.parse(localUserRaw));
            } catch (e) {
              setUser(null);
            }
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
    let payload = await fetchApiJson('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });
    if (!payload.ok && shouldUseLocalFallback(payload)) {
      payload = await localSignupFallback({ username, password, email });
    }
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
    let payload = await fetchApiJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!payload.ok && shouldUseLocalFallback(payload)) {
      payload = await localLoginFallback({ username, password });
    }
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
    let payload = await fetchApiJson('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!payload.ok && shouldUseLocalFallback(payload)) {
      payload = await localForgotFallback(email);
    }
    if (!payload.ok) throw new Error(payload.error || 'Failed to request reset');
    // payload may include token for dev
    return { username: payload.username, token: payload.token };
  }

  async function resetPassword({ username, token, newPassword }) {
    let payload = await fetchApiJson('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, token, newPassword }),
    });
    if (!payload.ok && shouldUseLocalFallback(payload)) {
      await localResetFallback({ username, token, newPassword });
      payload = { ok: true };
    }
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
