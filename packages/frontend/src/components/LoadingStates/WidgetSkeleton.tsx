import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';
import './WidgetSkeleton.css';

export interface WidgetSkeletonProps {
  variant?: 'card' | 'list' | 'chart' | 'header' | 'notification';
  count?: number;
  className?: string;
}

export const WidgetSkeleton: React.FC<WidgetSkeletonProps> = ({
  variant = 'card',
  count = 1,
  className = ''
}) => {
  const renderCardSkeleton = () => (
    <div className="widget-skeleton widget-skeleton--card">
      <div className="widget-skeleton__header">
        <SkeletonLoader variant="text" width="60%" height="20px" />
        <SkeletonLoader variant="circular" width="24px" height="24px" />
      </div>
      <div className="widget-skeleton__content">
        <SkeletonLoader variant="text" lines={3} />
      </div>
      <div className="widget-skeleton__footer">
        <SkeletonLoader variant="rectangular" width="80px" height="32px" />
        <SkeletonLoader variant="rectangular" width="60px" height="32px" />
      </div>
    </div>
  );

  const renderListSkeleton = () => (
    <div className="widget-skeleton widget-skeleton--list">
      <div className="widget-skeleton__header">
        <SkeletonLoader variant="text" width="40%" height="18px" />
      </div>
      <div className="widget-skeleton__items">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="widget-skeleton__item">
            <SkeletonLoader variant="circular" width="40px" height="40px" />
            <div className="widget-skeleton__item-content">
              <SkeletonLoader variant="text" width="70%" height="16px" />
              <SkeletonLoader variant="text" width="50%" height="14px" />
            </div>
            <SkeletonLoader variant="text" width="60px" height="12px" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderChartSkeleton = () => (
    <div className="widget-skeleton widget-skeleton--chart">
      <div className="widget-skeleton__header">
        <SkeletonLoader variant="text" width="50%" height="20px" />
        <SkeletonLoader variant="rectangular" width="100px" height="28px" />
      </div>
      <div className="widget-skeleton__chart">
        <div className="widget-skeleton__chart-bars">
          {Array.from({ length: 6 }, (_, index) => (
            <div 
              key={index} 
              className="widget-skeleton__chart-bar"
              style={{ height: `${Math.random() * 60 + 20}%` }}
            >
              <SkeletonLoader variant="rectangular" width="100%" height="100%" />
            </div>
          ))}
        </div>
        <div className="widget-skeleton__chart-legend">
          <SkeletonLoader variant="text" width="100%" height="12px" />
        </div>
      </div>
    </div>
  );

  const renderHeaderSkeleton = () => (
    <div className="widget-skeleton widget-skeleton--header">
      <div className="widget-skeleton__brand">
        <SkeletonLoader variant="circular" width="32px" height="32px" />
        <SkeletonLoader variant="text" width="120px" height="20px" />
      </div>
      <div className="widget-skeleton__nav">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonLoader key={index} variant="text" width="80px" height="16px" />
        ))}
      </div>
      <div className="widget-skeleton__actions">
        <SkeletonLoader variant="circular" width="36px" height="36px" />
        <SkeletonLoader variant="circular" width="36px" height="36px" />
        <SkeletonLoader variant="circular" width="36px" height="36px" />
      </div>
    </div>
  );

  const renderNotificationSkeleton = () => (
    <div className="widget-skeleton widget-skeleton--notification">
      <div className="widget-skeleton__header">
        <SkeletonLoader variant="text" width="60%" height="18px" />
        <SkeletonLoader variant="text" width="40px" height="14px" />
      </div>
      <div className="widget-skeleton__notifications">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="widget-skeleton__notification-item">
            <div className="widget-skeleton__notification-indicator">
              <SkeletonLoader variant="circular" width="12px" height="12px" />
            </div>
            <div className="widget-skeleton__notification-content">
              <SkeletonLoader variant="text" width="80%" height="16px" />
              <SkeletonLoader variant="text" width="60%" height="14px" />
              <SkeletonLoader variant="text" width="40%" height="12px" />
            </div>
            <div className="widget-skeleton__notification-actions">
              <SkeletonLoader variant="rectangular" width="60px" height="24px" />
              <SkeletonLoader variant="rectangular" width="50px" height="24px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return renderCardSkeleton();
      case 'list':
        return renderListSkeleton();
      case 'chart':
        return renderChartSkeleton();
      case 'header':
        return renderHeaderSkeleton();
      case 'notification':
        return renderNotificationSkeleton();
      default:
        return renderCardSkeleton();
    }
  };

  return (
    <div className={`widget-skeleton-container ${className}`} role="status" aria-label="Loading content...">
      {renderSkeleton()}
      <span className="sr-only">Loading content...</span>
    </div>
  );
};