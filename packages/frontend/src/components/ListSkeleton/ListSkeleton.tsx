import React from 'react';
import './ListSkeleton.css';

interface ListSkeletonProps {
  count?: number;
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  count = 5,
  className = '',
}) => {
  return (
    <div className={`list-skeleton ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="list-skeleton__item">
          <div className="list-skeleton__avatar"></div>
          <div className="list-skeleton__content">
            <div className="list-skeleton__title"></div>
            <div className="list-skeleton__subtitle"></div>
            <div className="list-skeleton__text"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
