import React, { useEffect, useState } from 'react';
import tmdb from '../api/tmdb';

export default function DebugPanel() {
  const [info, setInfo] = useState({ loading: true, ok: false, msg: '', count: 0 });
  const [keyInput, setKeyInput] = useState('');

  const runTest = async () => {
    setInfo({ loading: true, ok: false, msg: '', count: 0 });
    try {
      const data = await tmdb.getPopular(1);
      setInfo({ loading: false, ok: true, msg: 'OK', count: data.results?.length || 0 });
    } catch (err) {
      setInfo({ loading: false, ok: false, msg: err.message || String(err), count: 0 });
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await runTest();
    })();
    return () => (mounted = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // only show in development to avoid leaking keys in production
  if (process.env.NODE_ENV !== 'development') return null;

  const savedKey = (process.env.REACT_APP_TMDB_API_KEY || process.env.REACT_APP_API_KEY) || (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('REACT_APP_TMDB_API_KEY')) || '';

  const saveKey = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('REACT_APP_TMDB_API_KEY', keyInput.trim());
      }
      // re-run test (tmdb helper reads from localStorage fallback)
      runTest();
    } catch (e) {
      // ignore
    }
  };

  return (
    <div style={{ position: 'fixed', right: 12, top: 80, zIndex: 60, background: '#111827', color: '#fff', padding: 12, borderRadius: 8, fontSize: 13, maxWidth: 360 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Debug Panel (dev only)</div>
      <div>TMDB Key Present: {savedKey ? 'yes' : 'no'}</div>
      <div style={{ marginTop: 6 }}>Request: {info.loading ? 'loading...' : info.ok ? `OK — ${info.count} items` : `ERROR: ${info.msg}`}</div>
      {info.msg && <div style={{ marginTop: 6, wordBreak: 'break-word' }}>{info.msg}</div>}

      <div style={{ marginTop: 8 }}>
        <input
          aria-label="tmdb-key"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="Paste TMDB key here"
          style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={saveKey} style={{ flex: 1, padding: '6px 8px', borderRadius: 4, background: '#0ea5e9', border: 'none', color: '#000' }}>Save Key & Test</button>
          <button onClick={runTest} style={{ flex: 1, padding: '6px 8px', borderRadius: 4, background: '#94a3b8', border: 'none', color: '#000' }}>Re-test</button>
        </div>
      </div>
    </div>
  );
}
