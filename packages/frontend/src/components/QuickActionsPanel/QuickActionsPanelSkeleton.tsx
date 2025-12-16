import React from 'react';
import './QuickActionsPanel.css';

export const QuickActionsPanelSkeleton: React.FC = () => {
  return (
    <div className="quick-actions-panel quick-actions-panel--skeleton">
      <div className="quick-actions-panel__header">
        <div className="skeleton skeleton--panel-title"></div>
        <div className="skeleton skeleton--customize-button"></div>
      </div>
      
      <div className="quick-actions-panel__grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="quick-action-button quick-action-button--skeleton">
            <div className="skeleton skeleton--action-icon"></div>
            <div className="skeleton skeleton--action-label"></div>
            <div className="skeleton skeleton--action-shortcut"></div>
          </div>
        ))}
      </div>
    </div>
  );
};