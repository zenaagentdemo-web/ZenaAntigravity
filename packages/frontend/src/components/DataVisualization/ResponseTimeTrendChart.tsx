import React from 'react';
import { Chart, ChartDataPoint } from './Chart';
import './ResponseTimeTrendChart.css';

export interface ResponseTimeData {
  date: Date;
  averageResponseTime: number; // in hours
  responseCount: number;
  targetResponseTime?: number; // in hours
}

export interface ResponseTimeTrendChartProps {
  data: ResponseTimeData[];
  timeframe: 'week' | 'month' | 'quarter';
  targetResponseTime?: number; // in hours
  onDataPointClick?: (data: ResponseTimeData) => void;
  className?: string;
}

export const ResponseTimeTrendChart: React.FC<ResponseTimeTrendChartProps> = ({
  data,
  timeframe,
  targetResponseTime = 2, // 2 hours default target
  onDataPointClick,
  className = ''
}) => {
  const getPerformanceLevel = (responseTime: number, target: number): 'excellent' | 'good' | 'warning' | 'poor' => {
    const ratio = responseTime / target;
    if (ratio <= 0.5) return 'excellent';
    if (ratio <= 1) return 'good';
    if (ratio <= 2) return 'warning';
    return 'poor';
  };

  const getPerformanceColor = (level: 'excellent' | 'good' | 'warning' | 'poor'): string => {
    const colors = {
      excellent: 'var(--color-success-500)', // Green
      good: 'var(--color-primary-500)',      // Blue
      warning: 'var(--color-warning-500)',   // Amber
      poor: 'var(--color-error-500)'         // Red
    };
    return colors[level];
  };

  const formatTimeLabel = (date: Date): string => {
    switch (timeframe) {
      case 'week':
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'quarter':
        return date.toLocaleDateString('en-US', { month: 'short' });
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatResponseTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    }
    return `${Math.round(hours / 24)}d`;
  };

  const chartData: ChartDataPoint[] = data.map((point) => {
    const performanceLevel = getPerformanceLevel(point.averageResponseTime, targetResponseTime);
    return {
      label: formatTimeLabel(point.date),
      value: point.averageResponseTime,
      color: getPerformanceColor(performanceLevel),
      metadata: {
        ...point,
        performanceLevel,
        formattedTime: formatResponseTime(point.averageResponseTime)
      }
    };
  });

  const handleDataPointClick = (dataPoint: ChartDataPoint, index: number) => {
    const responseData = dataPoint.metadata as ResponseTimeData & { performanceLevel: string };
    if (onDataPointClick) {
      onDataPointClick(responseData);
    }
  };

  const averageResponseTime = data.reduce((sum, point) => sum + point.averageResponseTime, 0) / data.length;
  const totalResponses = data.reduce((sum, point) => sum + point.responseCount, 0);
  const performanceLevel = getPerformanceLevel(averageResponseTime, targetResponseTime);

  const getPerformanceMessage = (): { type: 'success' | 'warning' | 'error' | 'info', message: string } => {
    switch (performanceLevel) {
      case 'excellent':
        return {
          type: 'success',
          message: `Outstanding! Your average response time of ${formatResponseTime(averageResponseTime)} is well below the ${formatResponseTime(targetResponseTime)} target.`
        };
      case 'good':
        return {
          type: 'success',
          message: `Great work! You're meeting your ${formatResponseTime(targetResponseTime)} response time target with an average of ${formatResponseTime(averageResponseTime)}.`
        };
      case 'warning':
        return {
          type: 'warning',
          message: `Your response time of ${formatResponseTime(averageResponseTime)} is above the ${formatResponseTime(targetResponseTime)} target. Consider prioritizing urgent emails.`
        };
      case 'poor':
        return {
          type: 'error',
          message: `Response time needs improvement. At ${formatResponseTime(averageResponseTime)}, you're significantly above the ${formatResponseTime(targetResponseTime)} target.`
        };
      default:
        return {
          type: 'info',
          message: `Your average response time this ${timeframe} is ${formatResponseTime(averageResponseTime)}.`
        };
    }
  };

  const performanceMessage = getPerformanceMessage();

  const getImprovementSuggestions = (): string[] => {
    const suggestions: string[] = [];
    
    if (performanceLevel === 'warning' || performanceLevel === 'poor') {
      suggestions.push('Set up email notifications for urgent messages');
      suggestions.push('Use quick reply templates for common responses');
      suggestions.push('Schedule dedicated time blocks for email responses');
    }
    
    if (performanceLevel === 'poor') {
      suggestions.push('Consider using auto-responders to acknowledge receipt');
      suggestions.push('Prioritize focus threads over general inquiries');
    }
    
    return suggestions;
  };

  const suggestions = getImprovementSuggestions();

  return (
    <div className={`response-time-trend-chart ${className}`} data-testid="response-time-trend-chart">
      <div className="response-time-trend-chart__header">
        <div className="response-time-trend-chart__title">
          <h3>Response Time Trends</h3>
          <div className="response-time-trend-chart__summary">
            <span className="summary-item">
              <strong>{formatResponseTime(averageResponseTime)}</strong> Average Response Time
            </span>
            <span className="summary-item">
              <strong>{totalResponses}</strong> Total Responses
            </span>
            <span className="summary-item">
              Target: <strong>{formatResponseTime(targetResponseTime)}</strong>
            </span>
          </div>
        </div>
        <div className={`performance-indicator performance-indicator--${performanceLevel}`}>
          <div className="performance-indicator__icon">
            {performanceLevel === 'excellent' && '🎉'}
            {performanceLevel === 'good' && '✅'}
            {performanceLevel === 'warning' && '⚠️'}
            {performanceLevel === 'poor' && '🚨'}
          </div>
          <div className="performance-indicator__label">
            {performanceLevel.charAt(0).toUpperCase() + performanceLevel.slice(1)}
          </div>
        </div>
      </div>

      <div className="response-time-trend-chart__visualization">
        <Chart
          data={chartData}
          type="line"
          width={600}
          height={300}
          showLabels={true}
          showValues={false}
          colorScheme="default"
          onDataPointClick={handleDataPointClick}
          className="response-time-chart"
        />
        
        {/* Target line overlay */}
        <div className="target-line-container">
          <div 
            className="target-line"
            style={{
              bottom: `${((targetResponseTime / Math.max(...data.map(d => d.averageResponseTime))) * 260) + 40}px`
            }}
          >
            <span className="target-line__label">Target: {formatResponseTime(targetResponseTime)}</span>
          </div>
        </div>
      </div>

      <div className={`response-time-trend-chart__feedback feedback--${performanceMessage.type}`}>
        <div className="feedback__icon">
          {performanceMessage.type === 'success' && '✅'}
          {performanceMessage.type === 'warning' && '⚠️'}
          {performanceMessage.type === 'error' && '🚨'}
          {performanceMessage.type === 'info' && 'ℹ️'}
        </div>
        <div className="feedback__message">{performanceMessage.message}</div>
      </div>

      {suggestions.length > 0 && (
        <div className="response-time-trend-chart__suggestions">
          <h4 className="suggestions__title">💡 Improvement Suggestions</h4>
          <ul className="suggestions__list">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="suggestions__item">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="response-time-trend-chart__legend">
        <div className="legend__title">Performance Levels</div>
        <div className="legend__items">
          <div className="legend__item">
            <div className="legend__color" style={{ backgroundColor: '#10B981' }}></div>
            <span>Excellent (&lt; {formatResponseTime(targetResponseTime / 2)})</span>
          </div>
          <div className="legend__item">
            <div className="legend__color" style={{ backgroundColor: '#3B82F6' }}></div>
            <span>Good (&lt; {formatResponseTime(targetResponseTime)})</span>
          </div>
          <div className="legend__item">
            <div className="legend__color" style={{ backgroundColor: '#F59E0B' }}></div>
            <span>Warning (&lt; {formatResponseTime(targetResponseTime * 2)})</span>
          </div>
          <div className="legend__item">
            <div className="legend__color" style={{ backgroundColor: '#EF4444' }}></div>
            <span>Poor (≥ {formatResponseTime(targetResponseTime * 2)})</span>
          </div>
        </div>
      </div>
    </div>
  );
};