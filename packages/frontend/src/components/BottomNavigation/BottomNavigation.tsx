import React, { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './BottomNavigation.css';

interface RippleState {
  x: number;
  y: number;
  id: number;
}

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const [ripples, setRipples] = useState<{ [key: string]: RippleState[] }>({});

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleRipple = useCallback((e: React.MouseEvent | React.TouchEvent, itemId: string) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const id = Date.now();

    setRipples(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), { x, y, id }]
    }));

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => ({
        ...prev,
        [itemId]: (prev[itemId] || []).filter(r => r.id !== id)
      }));
    }, 600);
  }, []);

  // Navigation items with central Zena orb
  const navItems = [
    { path: '/', label: 'Home', icon: 'home', isCenter: false },
    { path: '/new', label: 'New', icon: 'mail', isCenter: false },
    { path: '/avatar-demo', label: 'Zena', icon: 'zena', isCenter: true },
    { path: '/waiting', label: 'Awaiting', icon: 'waiting', isCenter: false },
    { path: '/contacts', label: 'Contacts', icon: 'contacts', isCenter: false },
  ];

  const renderIcon = (icon: string, isActiveItem: boolean) => {
    const iconClass = `bottom-nav-ht__icon ${isActiveItem ? 'bottom-nav-ht__icon--active' : ''}`;

    switch (icon) {
      case 'home':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case 'mail':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        );
      case 'waiting':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'zena':
        return null; // Zena orb has special rendering
      case 'contacts':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'properties':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <nav
      className="bottom-nav-ht"
      role="navigation"
      aria-label="Mobile navigation"
      data-testid="bottom-navigation"
    >
      {/* Glassmorphism background with border glow */}
      <div className="bottom-nav-ht__glass-bg" />
      <div className="bottom-nav-ht__border-glow" />

      <div className="bottom-nav-ht__content">
        {navItems.map((item) => {
          const active = isActive(item.path);

          if (item.isCenter) {
            // Central Zena Orb Button
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`bottom-nav-ht__zena-orb ${active ? 'bottom-nav-ht__zena-orb--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label="Go to Zena Immersive"
                onMouseDown={(e) => handleRipple(e, item.path)}
                onTouchStart={(e) => handleRipple(e, item.path)}
              >
                <div className="bottom-nav-ht__zena-orb-inner">
                  <div className="bottom-nav-ht__zena-orb-gradient" />
                  <span className="bottom-nav-ht__zena-orb-text">Z</span>
                </div>
                {/* Ripples */}
                {(ripples[item.path] || []).map(ripple => (
                  <span
                    key={ripple.id}
                    className="bottom-nav-ht__ripple bottom-nav-ht__ripple--neon"
                    style={{ left: ripple.x, top: ripple.y }}
                  />
                ))}
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`bottom-nav-ht__item ${active ? 'bottom-nav-ht__item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onMouseDown={(e) => handleRipple(e, item.path)}
              onTouchStart={(e) => handleRipple(e, item.path)}
            >
              {renderIcon(item.icon, active)}
              <span className={`bottom-nav-ht__label ${active ? 'bottom-nav-ht__label--active' : ''}`}>
                {item.label}
              </span>
              {/* Active glow indicator */}
              {active && <div className="bottom-nav-ht__active-glow" />}
              {/* Ripples */}
              {(ripples[item.path] || []).map(ripple => (
                <span
                  key={ripple.id}
                  className="bottom-nav-ht__ripple"
                  style={{ left: ripple.x, top: ripple.y }}
                />
              ))}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
