
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
    children: React.ReactNode;
}

/**
 * Portal Component
 * 
 * Renders children into a portal attached to document.body.
 * This effectively "breaks out" of any parent stacking contexts (overflow: hidden, transform, filter, etc.)
 * allowing elements like modals, tooltips, and floating action buttons to be properly fixed 
 * relative to the viewport.
 */
export const Portal: React.FC<PortalProps> = ({ children }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    return mounted ? createPortal(children, document.body) : null;
};
