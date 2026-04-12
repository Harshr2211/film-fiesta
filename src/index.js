import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './App.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ScrollToTop } from './components';


// Defensive fetch wrapper: strip unsupported 'top_p' from JSON request bodies
// This catches client-side fetch() calls and removes 'top_p' if present.
// It's intentionally conservative and only modifies requests with a JSON
// content-type and a JSON-string body. If anything goes wrong we fall back
// to the native fetch behavior.
if (typeof window !== 'undefined' && window.fetch) {
  const _originalFetch = window.fetch.bind(window);

  function stripTopP(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(stripTopP);
    for (const key of Object.keys(value)) {
      if (key === 'top_p') delete value[key];
      else value[key] = stripTopP(value[key]);
    }
    return value;
  }

  function getHeaderValue(headers, key) {
    if (!headers) return '';
    if (headers instanceof Headers) return headers.get(key) || '';
    if (Array.isArray(headers)) {
      const found = headers.find(([k]) => String(k).toLowerCase() === key.toLowerCase());
      return found ? found[1] : '';
    }
    if (typeof headers === 'object') {
      const match = Object.keys(headers).find((k) => k.toLowerCase() === key.toLowerCase());
      return match ? headers[match] : '';
    }
    return '';
  }

  window.fetch = async (input, init) => {
    try {
      // Normalize to URL and options
      let url = input;
      let opts = init || {};

      // If input is a Request, extract data
      if (input instanceof Request) {
        url = input.url;
        // Build options from the Request
        opts = {
          method: input.method,
          headers: Array.from(input.headers || []).reduce((acc, [k, v]) => {
            acc[k] = v;
            return acc;
          }, {}),
          body: undefined,
          // keep credentials/mode/cache if present
          credentials: input.credentials,
          mode: input.mode,
          cache: input.cache,
          redirect: input.redirect,
          referrer: input.referrer,
          referrerPolicy: input.referrerPolicy,
          integrity: input.integrity,
        };
        // Try to read the body if it's a string-backed request
        try {
          const clone = input.clone();
          const text = await clone.text();
          if (text) opts.body = text;
        } catch (e) {
          // ignore bodies we can't read
        }
      }

      const method = (opts.method || 'GET').toUpperCase();

      // Only consider modifying bodies for methods that usually carry JSON
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && opts.body) {
        const contentType = String(getHeaderValue(opts.headers, 'content-type') || '').toLowerCase();

        if (typeof opts.body === 'string') {
          const canTryJson = contentType.includes('application/json') || opts.body.trim().startsWith('{') || opts.body.trim().startsWith('[');
          if (canTryJson) {
            try {
              const parsed = JSON.parse(opts.body);
              const before = JSON.stringify(parsed);
              stripTopP(parsed);
              const after = JSON.stringify(parsed);
              if (before !== after) {
                opts.body = after;
                console.debug('[fetch-wrapper] removed unsupported param top_p for', url);
              }
            } catch (e) {
              // ignore non-JSON bodies
            }
          }
        }
      }

      // If the original call used a Request object, reconstruct it with modified body
      if (input instanceof Request) {
        const newHeaders = new Headers(opts.headers || {});
        const newReq = new Request(url, {
          method: opts.method || input.method,
          headers: newHeaders,
          body: typeof opts.body === 'string' ? opts.body : undefined,
          credentials: opts.credentials || input.credentials,
          mode: opts.mode || input.mode,
          cache: opts.cache || input.cache,
          redirect: opts.redirect || input.redirect,
          referrer: opts.referrer || input.referrer,
          referrerPolicy: opts.referrerPolicy || input.referrerPolicy,
          integrity: opts.integrity || input.integrity,
        });
        return _originalFetch(newReq);
      }

      // Otherwise call fetch with potentially modified init
      return _originalFetch(url, opts);
    } catch (err) {
      // On any error, fallback to native fetch
      try { return await _originalFetch(input, init); } catch (e) { throw err; }
    }
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <React.StrictMode>
      <ScrollToTop />
      <App />
    </React.StrictMode>
  </BrowserRouter>
);


