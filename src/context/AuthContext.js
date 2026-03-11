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

const AuthContext = createContext(null);

const API = process.env.REACT_APP_API_URL || null;

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
    // prefer server-side session if configured
    const token = window.localStorage.getItem('ff_token');
    const local = window.localStorage.getItem('ff_user');
    if (!API) {
      // fallback to previous local-only session
      try {
        if (local) setUser(JSON.parse(local));
      } catch (e) {
        setUser(null);
      }
      return;
    }

    if (token) {
      // validate token with /api/auth/me
      fetch(`${API.replace(/\/$/, '')}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
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
    if (!API) {
      // fallback to client-only behavior
      const usersRaw = window.localStorage.getItem('ff_users');
      const users = usersRaw ? JSON.parse(usersRaw) : [];
      if (users.find((u) => u.username === username)) throw new Error('Username already exists');
      // store password insecurely in fallback — keep previous hashing approach by using Web Crypto
      const pwHash = await (async (pw) => {
        if (!pw || !window.crypto || !window.crypto.subtle) return pw;
        const enc = new TextEncoder().encode(pw);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
      })(password);
      users.push({ username, email, passwordHash: pwHash });
      window.localStorage.setItem('ff_users', JSON.stringify(users));
      const publicUser = { name: username };
      window.localStorage.setItem('ff_user', JSON.stringify(publicUser));
      clearRecommendationProfile(username);
      setUser(publicUser);
      setNotifications(pushNotification(username, {
        type: 'success',
        title: 'Welcome to FilmFiesta',
        message: 'Your account is ready. Let’s build your perfect movie vibe.',
      }));
      setShowLogin(false);
      return publicUser;
    }

    // server flow
    const res = await fetch(`${API.replace(/\/$/, '')}/api/auth/signup`, {
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
    if (!API) {
      // fallback local
      const usersRaw = window.localStorage.getItem('ff_users');
      const users = usersRaw ? JSON.parse(usersRaw) : [];
    const uname = String(username).toLowerCase();
    const u = users.find((x) => (x.username && x.username.toLowerCase() === uname) || (x.email && x.email.toLowerCase() === uname));
      if (!u) throw new Error('User not found');
      const pwHash = await (async (pw) => {
        if (!pw || !window.crypto || !window.crypto.subtle) return pw;
        const enc = new TextEncoder().encode(pw);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
      })(password);
      if (pwHash !== u.passwordHash) throw new Error('Invalid credentials');
      const publicUser = { name: username };
      window.localStorage.setItem('ff_user', JSON.stringify(publicUser));
      setUser(publicUser);
      setNotifications(pushNotification(username, {
        type: 'success',
        title: 'Signed in',
        message: 'Welcome back — your movie lounge is ready.',
      }));
      setShowLogin(false);
      return publicUser;
    }

    const res = await fetch(`${API.replace(/\/$/, '')}/api/auth/login`, {
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
    if (!API) {
      // local fallback: same as before
      const usersRaw = window.localStorage.getItem('ff_users');
      const users = usersRaw ? JSON.parse(usersRaw) : [];
      const u = users.find((x) => x.email === email);
      if (!u) throw new Error('No account with that email');
      const token = Math.random().toString(36).slice(2, 10);
      try {
        window.localStorage.setItem(`ff_reset_${u.username}`, JSON.stringify({ token, createdAt: Date.now() }));
      } catch (e) {}
      return { username: u.username, token };
    }

    const res = await fetch(`${API.replace(/\/$/, '')}/api/auth/forgot`, {
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
    if (!API) {
      const dataRaw = window.localStorage.getItem(`ff_reset_${username}`);
      if (!dataRaw) throw new Error('No reset request');
      let data;
      try {
        data = JSON.parse(dataRaw);
        if (!data || data.token !== token) throw new Error('Invalid token');
      } catch (e) {
        throw new Error('Invalid token');
      }
      const usersRaw = window.localStorage.getItem('ff_users');
      const users = usersRaw ? JSON.parse(usersRaw) : [];
      const idx = users.findIndex((x) => x.username === username);
      if (idx === -1) throw new Error('User not found');
      const pwHash = await (async (pw) => {
        if (!pw || !window.crypto || !window.crypto.subtle) return pw;
        const enc = new TextEncoder().encode(pw);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
      })(newPassword);
      users[idx].passwordHash = pwHash;
      window.localStorage.setItem('ff_users', JSON.stringify(users));
      try {
        window.localStorage.removeItem(`ff_reset_${username}`);
      } catch (e) {}
      return true;
    }

    const res = await fetch(`${API.replace(/\/$/, '')}/api/auth/reset`, {
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
