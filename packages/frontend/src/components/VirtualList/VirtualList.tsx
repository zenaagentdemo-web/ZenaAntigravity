import React, { useState, useEffect, useRef, useCallback } from 'react';
import './VirtualList.css';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 3,
  className = '',
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }

    const handleResize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    e.persist(); // React 16 legacy, but safe to keep or remove in modern
    const target = e.currentTarget;

    // Performance: Use requestAnimationFrame to throttle scroll updates
    requestAnimationFrame(() => {
      if (target) {
        setScrollTop(target.scrollTop);
      }
    });
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`virtual-list ${className}`}
      onScroll={handleScroll}
    >
      <div
        className="virtual-list__spacer"
        style={{ height: `${totalHeight}px` }}
      >
        <div
          className="virtual-list__content"
          style={{ transform: `translateY(${offsetY}px)` }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              className="virtual-list__item"
              style={{ height: `${itemHeight}px` }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
