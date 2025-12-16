import React, { useState, useEffect } from 'react';
import { weatherService, type WeatherData } from '../../services/weatherService';
import './WeatherTimeWidget.css';



interface WeatherTimeWidgetProps {
  currentTime?: Date;
  weather?: WeatherData;
}

export const WeatherTimeWidget: React.FC<WeatherTimeWidgetProps> = ({
  currentTime = new Date(),
  weather
}) => {
  const [time, setTime] = useState(currentTime);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(weather || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Fetch weather data on component mount and every 30 minutes
  useEffect(() => {
    if (!weather) {
      fetchWeatherData();
      const weatherTimer = setInterval(fetchWeatherData, 30 * 60 * 1000); // 30 minutes
      return () => clearInterval(weatherTimer);
    }
  }, [weather]);

  // Fetch weather data with location detection
  const fetchWeatherData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to get user's location
      const location = await weatherService.getCurrentLocation();
      const weatherData = await weatherService.getWeatherForLocation(location);
      setCurrentWeather(weatherData);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Unable to load weather data');
      // Use Auckland, NZ as fallback
      try {
        const fallbackWeather = await weatherService.getWeatherForLocation({
          latitude: -36.8485,
          longitude: 174.7633,
          city: 'Auckland',
          country: 'New Zealand'
        });
        setCurrentWeather(fallbackWeather);
      } catch (fallbackErr) {
        console.error('Fallback weather error:', fallbackErr);
        setCurrentWeather(weatherService.getDefaultWeather());
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getWeatherIcon = (condition: string): string => {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('sunny') || conditionLower.includes('clear')) {
      return '☀️';
    } else if (conditionLower.includes('cloudy') || conditionLower.includes('overcast')) {
      return '☁️';
    } else if (conditionLower.includes('rain')) {
      return '🌧️';
    } else if (conditionLower.includes('snow')) {
      return '❄️';
    } else if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
      return '⛈️';
    } else {
      return '🌤️'; // Default partly cloudy
    }
  };

  const weatherData = currentWeather || weather || weatherService.getDefaultWeather();
  const weatherIcon = weatherData.icon || getWeatherIcon(weatherData.condition);

  // Intelligent property preparation recommendations - ALWAYS shows relevant tips
  const getPropertyRecommendations = (): Array<{
    icon: string;
    reason: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
  }> => {
    const recommendations = [];
    const temp = weatherData.temperature;
    const condition = weatherData.condition.toLowerCase();
    const humidity = weatherData.humidity || 50;
    const windSpeed = weatherData.windSpeed || 0;
    const currentHour = new Date().getHours();

    // Time-based recommendations for tomorrow (evening/night)
    if (currentHour >= 20 || currentHour < 6) {
      if (temp > 20) {
        recommendations.push({
          icon: '☀️',
          reason: 'Warm tomorrow',
          action: 'Pre-cool properties before morning viewings',
          priority: 'medium' as const
        });
      } else if (temp < 15) {
        recommendations.push({
          icon: '🔥',
          reason: 'Cool tomorrow',
          action: 'Schedule heating to warm properties overnight',
          priority: 'medium' as const
        });
      }
    }

    // Wind-based recommendations - check first as it's actionable
    if (windSpeed > 0) {
      if (windSpeed > 15) {
        recommendations.push({
          icon: '🪟',
          reason: `Windy (${windSpeed} km/h)`,
          action: 'Keep doors and windows closed during viewings',
          priority: 'high' as const
        });
      } else if (windSpeed > 8) {
        recommendations.push({
          icon: '🪟',
          reason: `Breezy (${windSpeed} km/h)`,
          action: 'Secure loose outdoor items before viewings',
          priority: 'medium' as const
        });
      }
    }

    // Temperature-based recommendations
    if (temp < 16) {
      recommendations.push({
        icon: '🔥',
        reason: `Cold (${temp}°C)`,
        action: 'Turn heating on 30min before viewings',
        priority: 'high' as const
      });
    } else if (temp > 28) {
      recommendations.push({
        icon: '❄️',
        reason: `Hot (${temp}°C)`,
        action: 'Pre-cool with AC before viewings',
        priority: 'high' as const
      });
    } else if (temp >= 16 && temp <= 22) {
      // Pleasant temperature - suggest opening windows if not windy
      if (windSpeed <= 8) {
        recommendations.push({
          icon: '🌿',
          reason: `Pleasant (${temp}°C)`,
          action: 'Open windows to let fresh air in',
          priority: 'low' as const
        });
      }
    } else if (temp > 22 && temp <= 28) {
      recommendations.push({
        icon: '🌡️',
        reason: `Warm (${temp}°C)`,
        action: 'Ensure good ventilation or light cooling',
        priority: 'medium' as const
      });
    }

    // Weather condition recommendations
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
      recommendations.push({
        icon: '💡',
        reason: 'Rain expected',
        action: 'Turn on all lights for brightness',
        priority: 'high' as const
      });
      recommendations.push({
        icon: '🚪',
        reason: 'Wet weather',
        action: 'Place mats at entrances for wet shoes',
        priority: 'medium' as const
      });
    }

    if (condition.includes('cloudy') || condition.includes('overcast')) {
      recommendations.push({
        icon: '💡',
        reason: 'Cloudy',
        action: 'Maximise lighting throughout property',
        priority: 'medium' as const
      });
    }

    // Humidity recommendations
    if (humidity > 70) {
      recommendations.push({
        icon: '💨',
        reason: `Humid (${humidity}%)`,
        action: 'Run dehumidifier or fans before viewing',
        priority: 'medium' as const
      });
    } else if (humidity < 30) {
      recommendations.push({
        icon: '💧',
        reason: `Dry air (${humidity}%)`,
        action: 'Consider a humidifier for comfort',
        priority: 'low' as const
      });
    }

    // Sunny/clear day opportunities
    if (condition.includes('sunny') || condition.includes('clear') || condition.includes('fine')) {
      recommendations.push({
        icon: '🌅',
        reason: 'Sunny',
        action: 'Open curtains to showcase natural light',
        priority: 'low' as const
      });
    }

    // Partly cloudy - common condition
    if (condition.includes('partly') || condition.includes('partial')) {
      recommendations.push({
        icon: '☀️',
        reason: 'Variable light',
        action: 'Keep lights on standby for cloudy moments',
        priority: 'low' as const
      });
    }

    // If still no recommendations, add general tips based on time of day
    if (recommendations.length === 0) {
      if (currentHour >= 6 && currentHour < 10) {
        recommendations.push({
          icon: '☕',
          reason: 'Morning viewing',
          action: 'Fresh coffee aroma creates welcoming atmosphere',
          priority: 'low' as const
        });
      } else if (currentHour >= 10 && currentHour < 14) {
        recommendations.push({
          icon: '✨',
          reason: 'Midday',
          action: 'Best natural light - open all blinds',
          priority: 'low' as const
        });
      } else if (currentHour >= 14 && currentHour < 18) {
        recommendations.push({
          icon: '🌤️',
          reason: 'Afternoon',
          action: 'Check west-facing rooms for glare',
          priority: 'low' as const
        });
      } else {
        recommendations.push({
          icon: '💡',
          reason: 'Evening viewing',
          action: 'Turn on all lights to showcase spaces',
          priority: 'medium' as const
        });
      }
    }

    // Sort by priority and return top 2
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    return recommendations.slice(0, 2);
  };

  const getWeatherAlert = (): string | null => {
    const temp = weatherData.temperature;
    const condition = weatherData.condition.toLowerCase();

    if (condition.includes('storm') || condition.includes('thunder')) {
      return 'Severe weather - consider rescheduling viewings';
    }
    
    if (temp < 5) {
      return 'Very cold - ensure heating is working';
    }
    
    if (temp > 35) {
      return 'Extreme heat - ensure cooling is available';
    }

    if (condition.includes('heavy rain') || condition.includes('downpour')) {
      return 'Heavy rain - check for leaks and drainage';
    }

    return null;
  };

  const weatherAlert = getWeatherAlert();
  const recommendations = getPropertyRecommendations();

  return (
    <div className="weather-time-widget">
      <div className="weather-time-widget__time-section">
        <span className="weather-time-widget__time">
          {formatTime(time)}
        </span>
      </div>
      
      <div className="weather-time-widget__weather-section">
        {loading ? (
          <div className="weather-time-widget__loading">
            <span className="weather-time-widget__loading-spinner"></span>
            <span className="weather-time-widget__loading-text">Loading weather...</span>
          </div>
        ) : error ? (
          <div className="weather-time-widget__error">
            <span className="weather-time-widget__error-icon">⚠️</span>
            <span className="weather-time-widget__error-text">Weather unavailable</span>
          </div>
        ) : (
          <>
            <div className="weather-time-widget__weather">
              <span className="weather-time-widget__weather-icon">{weatherIcon}</span>
              <span className="weather-time-widget__temperature">{weatherData.temperature}°C</span>
            </div>
            <div className="weather-time-widget__location">
              {weatherData.location}
            </div>
            {weatherData.humidity && weatherData.windSpeed && (
              <div className="weather-time-widget__details">
                <span className="weather-time-widget__detail">💧 {weatherData.humidity}%</span>
                <span className="weather-time-widget__detail">💨 {weatherData.windSpeed} km/h</span>
              </div>
            )}
            
            {/* Smart Property Recommendations - Collapsible */}
            {recommendations.length > 0 && (
              <div className="weather-time-widget__recommendations-wrapper">
                <button 
                  type="button"
                  className={`weather-time-widget__recommendations-toggle ${showRecommendations ? 'weather-time-widget__recommendations-toggle--expanded' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowRecommendations(!showRecommendations);
                  }}
                  aria-expanded={showRecommendations}
                  aria-label={showRecommendations ? 'Hide viewing tips' : 'Show viewing tips'}
                >
                  <span className="weather-time-widget__toggle-icon">💡</span>
                  <span className="weather-time-widget__toggle-text">
                    {recommendations.length} viewing {recommendations.length === 1 ? 'tip' : 'tips'}
                  </span>
                  <span className={`weather-time-widget__toggle-chevron ${showRecommendations ? 'weather-time-widget__toggle-chevron--up' : ''}`}>
                    ▼
                  </span>
                </button>
                
                {showRecommendations && (
                  <div 
                    className="weather-time-widget__recommendations weather-time-widget__recommendations--expanded"
                  >
                    {recommendations.map((rec, index) => (
                      <div 
                        key={index} 
                        className={`weather-time-widget__recommendation weather-time-widget__recommendation--${rec.priority}`}
                      >
                        <span className="weather-time-widget__recommendation-icon">{rec.icon}</span>
                        <div className="weather-time-widget__recommendation-content">
                          <span className="weather-time-widget__recommendation-reason">{rec.reason}:</span>
                          <span className="weather-time-widget__recommendation-text">{rec.action}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {weatherAlert && (
              <div className="weather-time-widget__alert">
                <span className="weather-time-widget__alert-icon">⚠️</span>
                <span className="weather-time-widget__alert-text">{weatherAlert}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};