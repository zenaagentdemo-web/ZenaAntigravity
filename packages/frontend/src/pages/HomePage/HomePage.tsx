import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

export const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <div className="container">
        <div className="home-page__hero">
          <h1 className="home-page__title">Welcome to Zena</h1>
          <p className="home-page__subtitle">
            Your AI-powered chief of staff for real estate
          </p>
        </div>

        <div className="home-page__cards">
          <Link to="/focus" className="home-page__card">
            <h2 className="home-page__card-title">Focus</h2>
            <p className="home-page__card-description">
              See threads that need your reply, prioritized by urgency
            </p>
          </Link>

          <Link to="/waiting" className="home-page__card">
            <h2 className="home-page__card-title">Waiting</h2>
            <p className="home-page__card-description">
              Track threads where you're waiting for responses
            </p>
          </Link>

          <Link to="/contacts" className="home-page__card">
            <h2 className="home-page__card-title">Contacts</h2>
            <p className="home-page__card-description">
              View and manage your buyers, vendors, and other contacts
            </p>
          </Link>

          <Link to="/properties" className="home-page__card">
            <h2 className="home-page__card-title">Properties</h2>
            <p className="home-page__card-description">
              Track properties and campaign milestones
            </p>
          </Link>

          <Link to="/ask-zena" className="home-page__card">
            <h2 className="home-page__card-title">Ask Zena</h2>
            <p className="home-page__card-description">
              Get instant answers about your deals and contacts
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};
