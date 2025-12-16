import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '../../utils/performance';
import './PerformanceDebugPanel.css';

interface PerformanceDebugPanelProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const PerformanceDebugPanel: React.FC<PerformanceDebugPanelProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState(performanceMonitor.getDashboardMetrics());
  const [requirements, setRequirements] = useState(performanceMonitor.checkPerformanceRequirements());

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getDashboardMetrics());
      setRequirements(performanceMonitor.checkPerformanceRequirements());
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled) return null;

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const getStatusIcon = (passed: boolean) => passed ? '✅' : '❌';

  return (
    <div className={`performance-debug-panel performance-debug-panel--${position}`}>
      <button 
        className="performance-debug-panel__toggle"
        onClick={toggleVisibility}
        title="Performance Monitor"
      >
        📊
      </button>
      
      {isVisible && (
        <div className="performance-debug-panel__content">
          <div className="performance-debug-panel__header">
            <h3>Performance Monitor</h3>
            <button 
              className="performance-debug-panel__close"
              onClick={toggleVisibility}
            >
              ×
            </button>
          </div>
          
          <div className="performance-debug-panel__section">
            <h4>Requirements Check</h4>
            <div className="performance-requirement">
              {getStatusIcon(requirements.dashboardLoadTime)} Dashboard Load: {metrics.dashboardLoadTime.toFixed(0)}ms (≤500ms)
            </div>
            <div className="performance-requirement">
              {getStatusIcon(requirements.interactionResponseTime)} Avg Interaction: {Object.values(metrics.interactionResponseTimes).length > 0 
                ? (Object.values(metrics.interactionResponseTimes).reduce((a, b) => a + b, 0) / Object.values(metrics.interactionResponseTimes).length).toFixed(0)
                : 0}ms (≤100ms)
            </div>
            <div className="performance-requirement">
              {getStatusIcon(requirements.backgroundRefresh)} Background Refresh: {metrics.backgroundRefreshTime.toFixed(0)}ms
            </div>
          </div>

          <div className="performance-debug-panel__section">
            <h4>Widget Loading</h4>
            <div className="performance-metric">
              Progress: {metrics.loadedWidgets}/{metrics.totalWidgets} widgets loaded
            </div>
            <div className="performance-widget-times">
              {Object.entries(metrics.widgetLoadTimes).map(([widget, time]) => (
                <div key={widget} className="performance-widget-time">
                  {widget}: {time.toFixed(1)}ms
                </div>
              ))}
            </div>
          </div>

          <div className="performance-debug-panel__section">
            <h4>Interactions</h4>
            <div className="performance-interaction-times">
              {Object.entries(metrics.interactionResponseTimes).map(([action, time]) => (
                <div key={action} className="performance-interaction-time">
                  {action}: {time.toFixed(1)}ms
                </div>
              ))}
            </div>
          </div>

          <div className="performance-debug-panel__actions">
            <button 
              onClick={() => performanceMonitor.clearMetrics()}
              className="performance-debug-panel__clear"
            >
              Clear Metrics
            </button>
          </div>
        </div>
      )}
    </div>
  );
};