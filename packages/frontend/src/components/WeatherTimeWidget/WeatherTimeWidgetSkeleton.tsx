import React from 'react';
import './WeatherTimeWidget.css';

export const WeatherTimeWidgetSkeleton: React.FC = () => {
  return (
    <div className="weather-time-widget weather-time-widget--skeleton" role="status" aria-label="Loading weather information">
      <div className="weather-time-widget__time-section">
        <div className="skeleton skeleton--time" aria-hidden="true"></div>
      </div>
      
      <div className="weather-time-widget__weather-section">
        <div className="weather-time-widget__weather">
          <div className="skeleton skeleton--weather-icon" aria-hidden="true"></div>
          <div className="skeleton skeleton--temperature" aria-hidden="true"></div>
        </div>
        <div className="skeleton skeleton--location" aria-hidden="true"></div>
        <div className="weather-time-widget__details">
          <div className="skeleton skeleton--detail" aria-hidden="true"></div>
          <div className="skeleton skeleton--detail" aria-hidden="true"></div>
        </div>
        
        <div className="weather-time-widget__recommendations">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="weather-time-widget__recommendation weather-time-widget__recommendation--skeleton">
              <div className="skeleton skeleton--recommendation-icon" aria-hidden="true"></div>
              <div className="weather-time-widget__recommendation-content">
                <div className="skeleton skeleton--recommendation-reason" aria-hidden="true"></div>
                <div className="skeleton skeleton--recommendation-text" aria-hidden="true"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading weather information...</span>
    </div>
  );
};
