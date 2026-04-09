export const API_BASE = process.env.REACT_APP_API_URL || null;

export function resolveApiUrl(path) {
  const normalizedPath = String(path || '');
  if (!normalizedPath.startsWith('/')) {
    throw new Error(`resolveApiUrl expected absolute path, got: ${normalizedPath}`);
  }

  if (!API_BASE) return normalizedPath;

  const normalizedBase = API_BASE.replace(/\/$/, '');

  if (normalizedBase.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${normalizedBase}${normalizedPath.slice(4)}`;
  }

  return `${normalizedBase}${normalizedPath}`;
}
