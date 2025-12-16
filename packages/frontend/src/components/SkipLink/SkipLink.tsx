/**
 * SkipLink Component
 * 
 * Provides a skip link for keyboard users to bypass navigation
 * and jump directly to main content. This is a WCAG 2.1 AA requirement.
 */

import React from 'react';
import './SkipLink.css';

export interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId?: string;
  /** Custom link text */
  text?: string;
  /** Additional skip links for complex layouts */
  additionalLinks?: Array<{
    targetId: string;
    text: string;
  }>;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId = 'main-content',
  text = 'Skip to main content',
  additionalLinks = [],
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="skip-links" aria-label="Skip links">
      <a
        href={`#${targetId}`}
        className="skip-link"
        onClick={(e) => handleClick(e, targetId)}
      >
        {text}
      </a>
      {additionalLinks.map((link) => (
        <a
          key={link.targetId}
          href={`#${link.targetId}`}
          className="skip-link"
          onClick={(e) => handleClick(e, link.targetId)}
        >
          {link.text}
        </a>
      ))}
    </nav>
  );
};

export default SkipLink;
