# Weather Service

The weather service provides real weather data for the dashboard widget.

## Setup

### Option 1: Use Real Weather Data (Recommended)

1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Copy `packages/frontend/.env.example` to `packages/frontend/.env`
3. Add your API key to the `.env` file:
   ```
   VITE_WEATHER_API_KEY=your_actual_api_key_here
   ```
4. Restart the development server

### Option 2: Use Fallback Data

If no API key is provided, the service automatically uses realistic fallback weather data based on:
- User's detected location (via browser geolocation)
- Current season and time of year
- Reasonable temperature ranges for the location

## Features

- **Automatic Location Detection**: Uses browser geolocation API to detect user's location
- **Auckland, NZ Fallback**: Defaults to Auckland when location detection fails
- **Real Weather Data**: Integrates with OpenWeatherMap API when API key is available
- **Realistic Fallback**: Provides season-appropriate weather data when API is unavailable
- **Celsius Temperature**: All temperatures are displayed in Celsius
- **City Name Resolution**: Converts coordinates to readable city names

## Location Detection

The service detects location using:

1. **Browser Geolocation API**: Requests user's current coordinates
2. **Reverse Geocoding**: Converts coordinates to city names
3. **Fallback to Auckland**: Uses Auckland, NZ coordinates when detection fails
4. **Manual Configuration**: Supports manual location override (future feature)

## Data Format

```typescript
interface WeatherData {
  temperature: number;    // Temperature in Celsius
  condition: string;      // Weather condition description
  icon: string;          // Emoji icon representing weather
  location: string;      // "City, Country" format
  humidity?: number;     // Humidity percentage
  windSpeed?: number;    // Wind speed in km/h
}
```

## Error Handling

The service gracefully handles:
- No internet connection
- API rate limits or failures
- Geolocation permission denied
- Invalid API keys
- Network timeouts

In all error cases, it falls back to realistic weather data for the user's location or Auckland, NZ.