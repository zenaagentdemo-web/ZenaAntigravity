import React from 'react';
import './ContextualInsightsWidget.css';

export interface BusinessMetric {
  id: string;
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  visualization: 'number' | 'chart' | 'progress';
  unit?: string;
  target?: number;
}

export interface TrendData {
  id: string;
  label: string;
  data: number[];
  timeframe: string[];
  color: string;
}

export interface ContextualInsightsProps {
  metrics: BusinessMetric[];
  trends: TrendData[];
  timeframe: 'week' | 'month' | 'quarter';
  onDrillDown: (metricId: string) => void;
}

export const ContextualInsightsWidget: React.FC<ContextualInsightsProps> = ({
  metrics,
  trends,
  timeframe,
  onDrillDown
}) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      case 'stable':
        return '→';
      default:
        return '→';
    }
  };

  const getTrendClass = (trend: 'up' | 'down' | 'stable', change: number) => {
    if (trend === 'stable') return 'trend--stable';
    if (trend === 'up') return change > 0 ? 'trend--positive' : 'trend--negative';
    if (trend === 'down') return change < 0 ? 'trend--negative' : 'trend--positive';
    return 'trend--stable';
  };

  const formatChange = (change: number, unit?: string) => {
    const sign = change > 0 ? '+' : '';
    const formattedChange = Math.abs(change) < 1 ? change.toFixed(2) : Math.round(change);
    return `${sign}${formattedChange}${unit || '%'}`;
  };

  const renderMicroVisualization = (metric: BusinessMetric) => {
    const relatedTrend = trends.find(t => t.id === metric.id);
    
    if (!relatedTrend || metric.visualization === 'number') {
      return null;
    }

    if (metric.visualization === 'progress' && metric.target) {
      const percentage = Math.min((metric.value / metric.target) * 100, 100);
      return (
        <div className="micro-viz micro-viz--progress">
          <div className="progress-bar">
            <div 
              className="progress-bar__fill" 
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="progress-text">{Math.round(percentage)}%</span>
        </div>
      );
    }

    if (metric.visualization === 'chart') {
      const maxValue = Math.max(...relatedTrend.data);
      const minValue = Math.min(...relatedTrend.data);
      const range = maxValue - minValue || 1;

      return (
        <div className="micro-viz micro-viz--chart">
          <svg width="60" height="20" className="trend-chart">
            <polyline
              points={relatedTrend.data
                .map((value, index) => {
                  const x = (index / (relatedTrend.data.length - 1)) * 58 + 1;
                  const y = 19 - ((value - minValue) / range) * 18;
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke={relatedTrend.color}
              strokeWidth="2"
            />
          </svg>
        </div>
      );
    }

    return null;
  };

  const generatePerformanceFeedback = () => {
    const responseTimeMetric = metrics.find(m => m.id === 'response-time');
    const dealPipelineMetric = metrics.find(m => m.id === 'deal-pipeline');
    
    if (responseTimeMetric && responseTimeMetric.trend === 'up' && responseTimeMetric.change > 0) {
      return {
        type: 'positive',
        message: `Great work! Your response time has improved by ${formatChange(responseTimeMetric.change, 'h')} this ${timeframe}.`
      };
    }
    
    if (dealPipelineMetric && dealPipelineMetric.trend === 'up') {
      return {
        type: 'positive',
        message: `Excellent! Your deal pipeline is growing with ${dealPipelineMetric.value} active deals.`
      };
    }
    
    if (responseTimeMetric && responseTimeMetric.trend === 'down' && responseTimeMetric.change < -20) {
      return {
        type: 'suggestion',
        message: 'Consider setting up automated responses to improve your response time performance.'
      };
    }
    
    return {
      type: 'neutral',
      message: `Your business metrics are stable this ${timeframe}. Keep up the consistent work!`
    };
  };

  const feedback = generatePerformanceFeedback();

  return (
    <div className="contextual-insights-widget" data-testid="contextual-insights-widget">
      <div className="contextual-insights-widget__header">
        <h2 className="contextual-insights-widget__title">Business Insights</h2>
        <span className="contextual-insights-widget__timeframe">
          This {timeframe}
        </span>
      </div>

      <div className="contextual-insights-widget__metrics">
        {metrics.slice(0, 3).map((metric) => (
          <div 
            key={metric.id}
            className="insight-metric"
            onClick={() => onDrillDown(metric.id)}
            data-testid={`metric-${metric.id}`}
          >
            <div className="insight-metric__header">
              <span className="insight-metric__label">{metric.label}</span>
              <div className={`insight-metric__trend ${getTrendClass(metric.trend, metric.change)}`}>
                <span className="trend-icon">{getTrendIcon(metric.trend)}</span>
                <span className="trend-change">{formatChange(metric.change, metric.unit)}</span>
              </div>
            </div>
            
            <div className="insight-metric__content">
              <div className="insight-metric__value">
                {metric.value.toLocaleString()}
                {metric.unit && <span className="metric-unit">{metric.unit}</span>}
              </div>
              {renderMicroVisualization(metric)}
            </div>
          </div>
        ))}
      </div>

      <div className={`contextual-insights-widget__feedback feedback--${feedback.type}`}>
        <div className="feedback__icon">
          {feedback.type === 'positive' && '🎉'}
          {feedback.type === 'suggestion' && '💡'}
          {feedback.type === 'neutral' && 'ℹ️'}
        </div>
        <div className="feedback__message">{feedback.message}</div>
      </div>

      {trends.length > 0 && (
        <div className="contextual-insights-widget__trends">
          <h3 className="trends__title">Performance Trends</h3>
          <div className="trends__list">
            {trends.slice(0, 2).map((trend) => (
              <div key={trend.id} className="trend-item" data-testid={`trend-${trend.id}`}>
                <div className="trend-item__header">
                  <span className="trend-item__label">{trend.label}</span>
                  <button 
                    className="trend-item__drill-down"
                    onClick={() => onDrillDown(trend.id)}
                    aria-label={`View details for ${trend.label}`}
                  >
                    View Details →
                  </button>
                </div>
                <div className="trend-item__chart">
                  <svg width="100%" height="40" className="trend-chart-full">
                    <polyline
                      points={trend.data
                        .map((value, index) => {
                          const maxValue = Math.max(...trend.data);
                          const minValue = Math.min(...trend.data);
                          const range = maxValue - minValue || 1;
                          const x = (index / (trend.data.length - 1)) * 100;
                          const y = 35 - ((value - minValue) / range) * 30;
                          return `${x}%,${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke={trend.color}
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};