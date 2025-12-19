/**
 * useRoutePreloader Hook
 * 
 * Preloads route components on hover/focus for faster navigation.
 * This significantly reduces perceived loading time by starting
 * the lazy load before the user actually clicks.
 */

// Route preload functions - maps route paths to their lazy import functions
const routePreloaders: Record<string, () => Promise<unknown>> = {
    '/': () => import('../pages/HighTechDashboardPage/HighTechDashboardPage'),
    '/new': () => import('../pages/NewPage/NewPage'),
    '/waiting': () => import('../pages/WaitingPage/WaitingPage'),
    '/deal-flow': () => import('../pages/DealFlowPage/DealFlowPage'),
    '/ask-zena': () => import('../pages/AskZenaPage/AskZenaPage'),
    '/contacts': () => import('../pages/ContactsPage/ContactsPage'),
    '/properties': () => import('../pages/PropertiesPage/PropertiesPage'),
    '/settings': () => import('../pages/SettingsPage/SettingsPage'),
    '/search': () => import('../pages/SearchPage/SearchPage'),
};

// Track which routes have been preloaded to avoid redundant loads
const preloadedRoutes = new Set<string>();

/**
 * Preload a specific route's component
 * @param path - The route path to preload
 */
export const preloadRoute = (path: string): void => {
    // Don't preload if already done
    if (preloadedRoutes.has(path)) {
        return;
    }

    const preloader = routePreloaders[path];
    if (preloader) {
        // Mark as preloading immediately to prevent duplicate calls
        preloadedRoutes.add(path);

        // Start the import (we don't need to wait for it)
        preloader().catch(() => {
            // If preload fails, remove from set so it can be retried
            preloadedRoutes.delete(path);
        });
    }
};

/**
 * Get event handlers for preloading a route on hover/focus
 * @param path - The route path to preload
 * @param delay - Delay in ms before preloading (default: 100ms)
 */
export const useRoutePreloader = (path: string, delay: number = 100) => {
    let timeoutId: NodeJS.Timeout | null = null;

    const handleMouseEnter = () => {
        // Start preload after a short delay to avoid preloading on quick mouse passes
        timeoutId = setTimeout(() => {
            preloadRoute(path);
        }, delay);
    };

    const handleMouseLeave = () => {
        // Cancel preload if mouse leaves before delay
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    const handleFocus = () => {
        // Preload immediately on focus (keyboard navigation)
        preloadRoute(path);
    };

    return {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onFocus: handleFocus,
    };
};

/**
 * Preload multiple routes at once (useful for initial app load)
 * @param paths - Array of route paths to preload
 */
export const preloadRoutes = (paths: string[]): void => {
    paths.forEach(preloadRoute);
};

/**
 * Preload common routes after initial app load
 * Called with a delay to not interfere with initial render
 */
export const preloadCommonRoutes = (): void => {
    // Preload the most commonly accessed routes
    setTimeout(() => {
        preloadRoutes(['/', '/new', '/deal-flow']);
    }, 2000); // Wait 2 seconds after initial load
};

export default useRoutePreloader;
