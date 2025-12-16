import React from 'react';
import './DashboardHeader.css';

export const DashboardHeaderSkeleton: React.FC = () => {
  return (
    <header className="dashboard-header" role="banner">
      <div className="dashboard-header__container">
        {/* Brand Section Skeleton */}
        <div className="dashboard-header__brand">
          <div className="dashboard-header__logo">
            <div className="skeleton skeleton--logo-icon"></div>
            <div className="skeleton skeleton--logo-text"></div>
          </div>
        </div>

        {/* Navigation Skeleton */}
        <nav className="dashboard-header__nav">
          <ul className="dashboard-header__nav-list">
            {[1, 2, 3, 4, 5].map((item) => (
              <li key={item} className="dashboard-header__nav-item">
                <div className="skeleton skeleton--nav-link"></div>
              </li>
            ))}
          </ul>
        </nav>

        {/* Actions Section Skeleton */}
        <div className="dashboard-header__actions">
          <div className="skeleton skeleton--action-btn"></div>
          <div className="skeleton skeleton--action-btn"></div>
          <div className="skeleton skeleton--action-btn"></div>
          <div className="dashboard-header__profile">
            <div className="skeleton skeleton--profile-btn"></div>
          </div>
        </div>
      </div>
    </header>
  );
};