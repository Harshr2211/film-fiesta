import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { hasRecommendationProfile } from '../utils/recommendations';

export default function LoginModal() {
  const auth = useAuth();
  const { showLogin, closeLogin, login, forgotPassword, signup } = auth || {};
  const navigate = useNavigate();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [message, setMessage] = useState(null);

  const isSignin = mode === 'signin';

  useEffect(() => {
    if (!showLogin) {
      setEmail('');
      setPassword('');
      setName('');
      setShowForgot(false);
      setMessage(null);
      setMode('signin');
    }
  }, [showLogin]);

  const handleOverlayClick = (e) => {
    if (e.target && e.target.id === 'authModal') {
      if (closeLogin) closeLogin();
    }
  };

  const handleClose = () => {
    if (closeLogin) closeLogin();
  };

  const handleSignin = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (login) {
        await login({ username: email.trim(), password });
        navigate(hasRecommendationProfile(email.trim()) ? '/recommendations' : '/onboarding/recommendations');
      }
    } catch (err) {
      setMessage(err.message || String(err));
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (signup) {
        await signup({ username: name.trim() || email.trim(), password, email: email.trim() });
        navigate('/onboarding/recommendations');
      }
    } catch (err) {
      setMessage(err.message || String(err));
    }
  };

  const handleSendReset = async () => {
    setMessage(null);
    try {
      if (forgotPassword) {
        const res = await forgotPassword(email.trim());
        setMessage(`Reset token (dev): ${res && res.token ? res.token : 'sent'}`);
      }
    } catch (err) {
      setMessage(err.message || String(err));
    }
  };

  return (
    <div id="authModal" className={`auth-overlay ${showLogin ? '' : 'hidden'}`} onClick={handleOverlayClick}>
      <div className="auth-shell modal-fade-in">
        <button id="closeAuth" className="auth-close" onClick={handleClose}>&times;</button>

        {message && (
          <div className="auth-message">
            {message}
          </div>
        )}

        <div className="auth-grid">
          <div className="auth-hero">
            <div className="auth-kicker">Premium movie nights start here</div>
            <h2 className="auth-display">{isSignin ? 'Step back into your cinema universe.' : 'Create your personal movie sanctuary.'}</h2>
            <p className="auth-lead">
              {isSignin
                ? 'Pick up your recommendations, watchlists, and comments in a polished space built for movie lovers.'
                : 'Set up your account, answer a few vibe questions, and unlock curated picks that feel made for you.'}
            </p>
            <div className="auth-badges">
              <span>Personalized picks</span>
              <span>Trailer-first discovery</span>
              <span>Premium dark mode</span>
            </div>
          </div>

          <div className="auth-panel">
            <div className="auth-mode-toggle">
              <button type="button" className={isSignin ? 'active' : ''} onClick={() => setMode('signin')}>Sign In</button>
              <button type="button" className={!isSignin ? 'active' : ''} onClick={() => setMode('signup')}>Sign Up</button>
            </div>

            <h1 className="auth-heading">{isSignin ? 'Welcome back' : 'Join FilmFiesta'}</h1>
            <p className="auth-sub">{isSignin ? 'Sign in to continue your premium movie journey.' : 'Create an account and get tailored recommendations instantly.'}</p>

            {isSignin ? (
              <form className="auth-form" id="loginForm" onSubmit={handleSignin}>
                <div className="floating-group">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  <label>Email address</label>
                </div>

                <div className="floating-group">
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  <label>Password</label>
                </div>

                <div className="auth-row">
                  <label className="remember">
                    <input type="checkbox" />
                    <span>Remember me</span>
                  </label>

                  <button type="button" className="forgot-link" onClick={() => setShowForgot((s) => !s)}>Forgot password?</button>
                </div>

                {showForgot ? (
                  <div className="forgot-box">
                    <p className="forgot-copy">We’ll generate a dev reset token for your email.</p>
                    <button type="button" className="gold-btn secondary" onClick={handleSendReset}>Send reset link</button>
                  </div>
                ) : null}

                <button type="submit" className="gold-btn">Enter FilmFiesta</button>

                <p className="signup-link">
                  Don’t have an account? <button type="button" onClick={() => setMode('signup')}>Create account</button>
                </p>
              </form>
            ) : (
              <form className="auth-form" id="signupForm" onSubmit={handleSignup}>
                <div className="floating-group">
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                  <label>Full name</label>
                </div>
                <div className="floating-group">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  <label>Email address</label>
                </div>
                <div className="floating-group">
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  <label>Create password</label>
                </div>

                <div className="auth-benefits">
                  <div>
                    <strong>Tailored picks</strong>
                    <span>Get recommendations matched to your exact vibe.</span>
                  </div>
                  <div>
                    <strong>Beautiful discovery</strong>
                    <span>Browse trailers, ratings, and streaming options in one place.</span>
                  </div>
                </div>

                <button type="submit" className="gold-btn">Create account</button>

                <p className="signup-link">
                  Already have an account? <button type="button" onClick={() => setMode('signin')}>Sign in</button>
                </p>
              </form>
            )}
            </div>
        </div>
      </div>
    </div>
  );
}
