import React from 'react';
import './Chart.css';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface ChartProps {
  data: ChartDataPoint[];
  type: 'line' | 'bar' | 'pie' | 'progress' | 'pipeline';
  title?: string;
  width?: number;
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  colorScheme?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onDataPointClick?: (dataPoint: ChartDataPoint, index: number) => void;
  className?: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

export const Chart: React.FC<ChartProps> = ({
  data,
  type,
  title,
  width = 300,
  height = 200,
  showLabels = true,
  showValues = false,
  colorScheme = 'default',
  onDataPointClick,
  className = '',
  loading = false,
  error = null,
  emptyMessage = 'No data available'
}) => {
  const getColorForIndex = (index: number, dataPoint: ChartDataPoint): string => {
    if (dataPoint.color) return dataPoint.color;
    
    // Professional color palette using CSS custom properties
    const colorSchemes = {
      default: [
        'var(--color-primary-500)',
        'var(--color-success-500)', 
        'var(--color-warning-500)',
        'var(--color-error-500)',
        'var(--color-primary-700)',
        'var(--color-success-600)',
        'var(--color-warning-600)',
        'var(--color-error-600)'
      ],
      success: [
        'var(--color-success-500)',
        'var(--color-success-600)', 
        'var(--color-success-700)',
        'var(--color-success-800)',
        'var(--color-success-400)'
      ],
      warning: [
        'var(--color-warning-500)',
        'var(--color-warning-600)',
        'var(--color-warning-700)',
        'var(--color-warning-800)',
        'var(--color-warning-400)'
      ],
      danger: [
        'var(--color-error-500)',
        'var(--color-error-600)',
        'var(--color-error-700)',
        'var(--color-error-800)',
        'var(--color-error-400)'
      ],
      info: [
        'var(--color-primary-500)',
        'var(--color-primary-600)',
        'var(--color-primary-700)',
        'var(--color-primary-800)',
        'var(--color-primary-400)'
      ]
    };
    
    return colorSchemes[colorScheme][index % colorSchemes[colorScheme].length];
  };

  const renderLineChart = () => {
    if (data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight;
      return { x, y, point, index };
    });

    return (
      <svg width={width} height={height} className="chart-svg">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Line */}
        <polyline
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={getColorForIndex(0, data[0])}
          strokeWidth="3"
          className="chart-line"
        />
        
        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={getColorForIndex(index, point.point)}
            className="chart-point"
            style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
            onClick={() => onDataPointClick?.(point.point, point.index)}
          />
        ))}
        
        {/* Labels */}
        {showLabels && points.map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={height - 10}
            textAnchor="middle"
            className="chart-label"
            fontSize="12"
          >
            {point.point.label}
          </text>
        ))}
        
        {/* Values */}
        {showValues && points.map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={point.y - 10}
            textAnchor="middle"
            className="chart-value"
            fontSize="11"
          >
            {point.point.value}
          </text>
        ))}
      </svg>
    );
  };

  const renderBarChart = () => {
    if (data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value));
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / data.length * 0.8;
    const barSpacing = chartWidth / data.length * 0.2;

    return (
      <svg width={width} height={height} className="chart-svg">
        {data.map((point, index) => {
          const barHeight = (point.value / maxValue) * chartHeight;
          const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
          const y = padding + chartHeight - barHeight;
          
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={getColorForIndex(index, point)}
                className="chart-bar"
                style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
                onClick={() => onDataPointClick?.(point, index)}
              />
              {showLabels && (
                <text
                  x={x + barWidth / 2}
                  y={height - 10}
                  textAnchor="middle"
                  className="chart-label"
                  fontSize="12"
                >
                  {point.label}
                </text>
              )}
              {showValues && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className="chart-value"
                  fontSize="11"
                >
                  {point.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  const renderPieChart = () => {
    if (data.length === 0) return null;
    
    const total = data.reduce((sum, point) => sum + point.value, 0);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    
    let currentAngle = -Math.PI / 2; // Start at top

    return (
      <svg width={width} height={height} className="chart-svg">
        {data.map((point, index) => {
          const percentage = point.value / total;
          const angle = percentage * 2 * Math.PI;
          const endAngle = currentAngle + angle;
          
          const x1 = centerX + radius * Math.cos(currentAngle);
          const y1 = centerY + radius * Math.sin(currentAngle);
          const x2 = centerX + radius * Math.cos(endAngle);
          const y2 = centerY + radius * Math.sin(endAngle);
          
          const largeArcFlag = angle > Math.PI ? 1 : 0;
          
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');
          
          const labelAngle = currentAngle + angle / 2;
          const labelRadius = radius * 0.7;
          const labelX = centerX + labelRadius * Math.cos(labelAngle);
          const labelY = centerY + labelRadius * Math.sin(labelAngle);
          
          currentAngle = endAngle;
          
          return (
            <g key={index}>
              <path
                d={pathData}
                fill={getColorForIndex(index, point)}
                className="chart-pie-slice"
                style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
                onClick={() => onDataPointClick?.(point, index)}
              />
              {showLabels && percentage > 0.05 && (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  className="chart-label"
                  fontSize="11"
                  fill="white"
                >
                  {point.label}
                </text>
              )}
              {showValues && percentage > 0.05 && (
                <text
                  x={labelX}
                  y={labelY + 12}
                  textAnchor="middle"
                  className="chart-value"
                  fontSize="10"
                  fill="white"
                >
                  {Math.round(percentage * 100)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  const renderProgressChart = () => {
    if (data.length === 0) return null;
    
    const barHeight = 20;
    const spacing = 30;
    const totalHeight = data.length * (barHeight + spacing) - spacing;
    const maxValue = Math.max(...data.map(d => d.value));

    return (
      <svg width={width} height={totalHeight + 40} className="chart-svg">
        {data.map((point, index) => {
          const percentage = (point.value / maxValue) * 100;
          const barWidth = (percentage / 100) * (width - 100);
          const y = index * (barHeight + spacing) + 20;
          
          return (
            <g key={index}>
              {/* Background bar */}
              <rect
                x={80}
                y={y}
                width={width - 100}
                height={barHeight}
                fill="#e5e7eb"
                rx="10"
              />
              {/* Progress bar */}
              <rect
                x={80}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={getColorForIndex(index, point)}
                rx="10"
                className="chart-progress-bar"
                style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
                onClick={() => onDataPointClick?.(point, index)}
              />
              {/* Label */}
              {showLabels && (
                <text
                  x={75}
                  y={y + barHeight / 2 + 4}
                  textAnchor="end"
                  className="chart-label"
                  fontSize="12"
                >
                  {point.label}
                </text>
              )}
              {/* Value */}
              {showValues && (
                <text
                  x={85 + barWidth}
                  y={y + barHeight / 2 + 4}
                  textAnchor="start"
                  className="chart-value"
                  fontSize="11"
                >
                  {point.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'progress':
        return renderProgressChart();
      case 'pipeline':
        return renderBarChart(); // Pipeline uses bar chart with special styling
      default:
        return renderLineChart();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`chart chart--${type} chart--${colorScheme} chart--loading ${className}`} data-testid={`chart-${type}`}>
        {title && <h3 className="chart__title">{title}</h3>}
        <div className="chart__container">
          <div className="chart__skeleton" style={{ width, height }}>
            <div className="skeleton-content">Loading chart data...</div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`chart chart--${type} chart--${colorScheme} chart--error ${className}`} data-testid={`chart-${type}`}>
        {title && <h3 className="chart__title">{title}</h3>}
        <div className="chart__container">
          <div className="chart__error" style={{ width, height }}>
            <div className="error-icon">⚠️</div>
            <div className="error-message">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className={`chart chart--${type} chart--${colorScheme} chart--empty ${className}`} data-testid={`chart-${type}`}>
        {title && <h3 className="chart__title">{title}</h3>}
        <div className="chart__container">
          <div className="chart__empty" style={{ width, height }}>
            <div className="empty-icon">📊</div>
            <div className="empty-message">{emptyMessage}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`chart chart--${type} chart--${colorScheme} ${className}`} data-testid={`chart-${type}`}>
      {title && <h3 className="chart__title">{title}</h3>}
      <div className="chart__container">
        {renderChart()}
      </div>
    </div>
  );
};