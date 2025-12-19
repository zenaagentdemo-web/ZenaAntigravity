import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (loading) {
      return;
    }

    setError('');
    setLoading(true);

    console.log('[LoginPage] Form submitted', { email });

    try {
      // Use direct fetch to avoid IndexedDB issues
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      console.log('[LoginPage] Login successful');

      // Store the JWT token
      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);

        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }

        // Redirect to home page with full page reload
        window.location.href = '/';
      } else {
        setError('Login failed: No token received');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[LoginPage] Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__container">
        <div className="login-page__header">
          <h1 className="login-page__title">Zena</h1>
          <p className="login-page__subtitle">Your AI-powered real estate assistant</p>
        </div>

        <form className="login-page__form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-page__error" role="alert">
              {error}
            </div>
          )}

          <div className="login-page__field">
            <label htmlFor="email" className="login-page__label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="login-page__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="login-page__field">
            <label htmlFor="password" className="login-page__label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="login-page__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="login-page__button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-page__footer">
          <p className="login-page__footer-text">
            Don't have an account?{' '}
            <button
              type="button"
              className="login-page__link"
              onClick={() => navigate('/register')}
              disabled={loading}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
