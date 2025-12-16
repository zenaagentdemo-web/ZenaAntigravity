import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/apiClient';
import './RegisterPage.css';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/auth/register', {
        name,
        email,
        password,
      }, { offlineQueue: false, cache: false });

      // Store the JWT token
      if (response.data.accessToken) {
        localStorage.setItem('authToken', response.data.accessToken);
        
        // Store refresh token if provided
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }

        // Navigate to home page
        navigate('/');
      } else {
        setError('Registration failed: No token received');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-page__container">
        <div className="register-page__header">
          <h1 className="register-page__title">Create Account</h1>
          <p className="register-page__subtitle">Join Zena to get started</p>
        </div>

        <form className="register-page__form" onSubmit={handleSubmit}>
          {error && (
            <div className="register-page__error" role="alert">
              {error}
            </div>
          )}

          <div className="register-page__field">
            <label htmlFor="name" className="register-page__label">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              className="register-page__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              disabled={loading}
            />
          </div>

          <div className="register-page__field">
            <label htmlFor="email" className="register-page__label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="register-page__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="register-page__field">
            <label htmlFor="password" className="register-page__label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="register-page__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
              minLength={8}
            />
            <span className="register-page__hint">
              Must be at least 8 characters
            </span>
          </div>

          <div className="register-page__field">
            <label htmlFor="confirmPassword" className="register-page__label">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="register-page__input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="register-page__button"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="register-page__footer">
          <p className="register-page__footer-text">
            Already have an account?{' '}
            <button
              type="button"
              className="register-page__link"
              onClick={() => navigate('/login')}
              disabled={loading}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
