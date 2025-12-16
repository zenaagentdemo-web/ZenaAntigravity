/**
 * Weather Service for fetching real weather data
 * 
 * To use with real weather data:
 * 1. Get a free API key from OpenWeatherMap (https://openweathermap.org/api)
 * 2. Add VITE_WEATHER_API_KEY to your .env file
 * 3. The service will automatically use real data when the API key is available
 */

interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  location: string;
  humidity?: number;
  windSpeed?: number;
}

interface LocationCoordinates {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

class WeatherService {
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';
  private readonly geoUrl = 'https://api.openweathermap.org/geo/1.0';

  constructor() {
    this.apiKey = import.meta.env.VITE_WEATHER_API_KEY;
  }

  /**
   * Get current location using browser geolocation API
   */
  async getCurrentLocation(): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          reject(error);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  }

  /**
   * Get weather data for a specific location
   */
  async getWeatherForLocation(location: LocationCoordinates): Promise<WeatherData> {
    if (!this.apiKey) {
      console.info('No weather API key found, using fallback data');
      return this.getFallbackWeatherData(location);
    }

    try {
      // Get city name from coordinates
      const locationName = await this.getCityFromCoordinates(location.latitude, location.longitude);
      
      // Get weather data
      const weatherResponse = await fetch(
        `${this.baseUrl}/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${this.apiKey}&units=metric`
      );
      
      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.status}`);
      }
      
      const weatherData = await weatherResponse.json();
      
      return {
        temperature: Math.round(weatherData.main.temp),
        condition: weatherData.weather[0].description,
        icon: this.mapWeatherIcon(weatherData.weather[0].main),
        location: locationName,
        humidity: weatherData.main.humidity,
        windSpeed: Math.round(weatherData.wind.speed * 3.6) // Convert m/s to km/h
      };
    } catch (error) {
      console.warn('Failed to fetch real weather data, using fallback:', error);
      return this.getFallbackWeatherData(location);
    }
  }

  /**
   * Get city name from coordinates using reverse geocoding
   */
  private async getCityFromCoordinates(lat: number, lon: number): Promise<string> {
    if (!this.apiKey) {
      return this.getLocationFallback(lat, lon);
    }

    try {
      const response = await fetch(
        `${this.geoUrl}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.length > 0) {
        const location = data[0];
        return `${location.name}, ${location.country}`;
      }
      
      throw new Error('No location data found');
    } catch (error) {
      console.warn('Failed to get city name, using fallback:', error);
      return this.getLocationFallback(lat, lon);
    }
  }

  /**
   * Get fallback location name when geocoding fails
   */
  private getLocationFallback(lat: number, lon: number): string {
    // Check if coordinates are in Auckland area
    if (lat > -37 && lat < -36 && lon > 174 && lon < 175) {
      return 'Auckland, New Zealand';
    }
    
    // Check other major cities (you can expand this)
    if (lat > 40.5 && lat < 40.9 && lon > -74.1 && lon < -73.7) {
      return 'New York, US';
    }
    
    if (lat > 51.3 && lat < 51.7 && lon > -0.3 && lon < 0.2) {
      return 'London, UK';
    }
    
    // Default to coordinates
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }

  /**
   * Map OpenWeatherMap weather conditions to emoji icons
   */
  private mapWeatherIcon(condition: string): string {
    const conditionLower = condition.toLowerCase();
    
    switch (conditionLower) {
      case 'clear':
        return '☀️';
      case 'clouds':
        return '☁️';
      case 'rain':
      case 'drizzle':
        return '🌧️';
      case 'thunderstorm':
        return '⛈️';
      case 'snow':
        return '❄️';
      case 'mist':
      case 'fog':
        return '🌫️';
      default:
        return '🌤️'; // Partly cloudy default
    }
  }

  /**
   * Generate realistic fallback weather data when API is unavailable
   */
  private getFallbackWeatherData(location: LocationCoordinates): WeatherData {
    const isAuckland = location.latitude > -37 && location.latitude < -36 && 
                      location.longitude > 174 && location.longitude < 175;
    
    const locationName = location.city && location.country ? 
      `${location.city}, ${location.country}` : 
      (isAuckland ? 'Auckland, New Zealand' : this.getLocationFallback(location.latitude, location.longitude));
    
    // Generate realistic weather based on location and season
    const month = new Date().getMonth();
    const isWinter = isAuckland ? (month >= 5 && month <= 7) : (month >= 11 || month <= 1);
    const isSummer = isAuckland ? (month >= 11 || month <= 1) : (month >= 5 && month <= 7);
    
    let baseTemp = isAuckland ? 16 : 15; // Base temperature
    if (isWinter) baseTemp -= 6;
    if (isSummer) baseTemp += 6;
    
    const dailyVariation = Math.random() * 6 - 3; // ±3°C daily variation
    const temperature = Math.round(baseTemp + dailyVariation);
    
    const conditions = ['clear', 'partly cloudy', 'cloudy', 'light rain'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      temperature,
      condition,
      icon: this.mapWeatherIcon(condition),
      location: locationName,
      humidity: Math.round(60 + Math.random() * 20), // 60-80%
      windSpeed: Math.round(8 + Math.random() * 12) // 8-20 km/h
    };
  }

  /**
   * Get default weather data for Auckland, NZ
   */
  getDefaultWeather(): WeatherData {
    return this.getFallbackWeatherData({
      latitude: -36.8485,
      longitude: 174.7633,
      city: 'Auckland',
      country: 'New Zealand'
    });
  }
}

export const weatherService = new WeatherService();
export type { WeatherData, LocationCoordinates };