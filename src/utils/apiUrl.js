const ENV_API_BASE = String(process.env.REACT_APP_API_URL || '').trim();

function inferLocalApiBase() {
  if (typeof window === 'undefined') return '/api';
  const host = String(window.location.hostname || '').toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:4000/api';
  }
  // In production, prefer direct function path; some deployments may not apply /api redirects consistently.
  return '/.netlify/functions/api';
}

export const API_BASE = ENV_API_BASE || inferLocalApiBase();

function isLocalHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
}

function shouldForceLocalApi() {
  if (typeof window === 'undefined') return false;
  return isLocalHost(window.location.hostname);
}

export const EFFECTIVE_API_BASE = shouldForceLocalApi()
  ? 'http://localhost:4000/api'
  : API_BASE;

export function resolveApiUrl(path) {
  const normalizedPath = String(path || '');
  if (!normalizedPath.startsWith('/')) {
    throw new Error(`resolveApiUrl expected absolute path, got: ${normalizedPath}`);
  }

  if (!EFFECTIVE_API_BASE) return normalizedPath;

  const normalizedBase = EFFECTIVE_API_BASE.replace(/\/$/, '');

  if (normalizedBase.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${normalizedBase}${normalizedPath.slice(4)}`;
  }

  if (normalizedBase.endsWith('/.netlify/functions/api') && normalizedPath.startsWith('/api/')) {
    return `${normalizedBase}${normalizedPath.slice(4)}`;
  }

  return `${normalizedBase}${normalizedPath}`;
}
