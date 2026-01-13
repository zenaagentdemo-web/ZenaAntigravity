import React, { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { preloadRoute } from '../../hooks/useRoutePreloader';
import { useGodmodeLogic } from '../../hooks/useGodmode';
import './BottomNavigation.css';

interface RippleState {
  x: number;
  y: number;
  id: number;
}

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { settings } = useGodmodeLogic();
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

  // Navigation items with central Deal Flow button
  const navItems = [
    { path: '/', label: 'Home', icon: 'home', isCenter: false },
    { path: '/inbox', label: 'Inbox', icon: 'inbox', isCenter: false },
    { path: '/deal-flow', label: 'Deal Flow', icon: 'dealflow', isCenter: true },
    { path: '/properties', label: 'Properties', icon: 'properties', isCenter: false },
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
      case 'inbox':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
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
      case 'dealflow':
        return null; // Deal Flow has special rendering
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
      case 'connections':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            <path d="M12 10V6" />
            <path d="M12 3v1" />
            <path d="M12 15h.01" />
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
            // Central Deal Flow Button - High-tech handshake
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`bottom-nav-ht__dealflow-orb ${active ? 'bottom-nav-ht__dealflow-orb--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label="Go to Deal Flow"
                style={
                  settings.mode === 'demi_god' ? { color: '#A78BFA' } :
                    settings.mode === 'full_god' ? { color: '#FCD34D' } : undefined
                }
                onMouseEnter={() => preloadRoute(item.path)}
                onFocus={() => preloadRoute(item.path)}
                onMouseDown={(e) => handleRipple(e, item.path)}
                onTouchStart={(e) => handleRipple(e, item.path)}
              >
                {/* Handshake Icon - Premium Generated Image */}
                <img
                  src="/assets/deal-flow-icon.png"
                  alt="Deal Flow"
                  className="bottom-nav-ht__dealflow-icon"
                />
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
              onMouseEnter={() => preloadRoute(item.path)}
              onFocus={() => preloadRoute(item.path)}
              onMouseDown={(e) => handleRipple(e, item.path)}
              onTouchStart={(e) => handleRipple(e, item.path)}
            >
              {renderIcon(item.icon, active)}
              <span
                className={`bottom-nav-ht__label ${active ? 'bottom-nav-ht__label--active' : ''}`}
                style={
                  (item.label === 'Properties' || item.label === 'Contacts') ? (
                    settings.mode === 'demi_god' ? { color: '#A78BFA' } :
                      settings.mode === 'full_god' ? { color: '#FCD34D' } : undefined
                  ) : undefined
                }
              >
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
