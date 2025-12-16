import { useState, useEffect, useRef, useCallback } from 'react';

export interface LazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

export interface LazyLoadingResult {
  isVisible: boolean;
  isLoaded: boolean;
  ref: React.RefObject<HTMLElement>;
  forceLoad: () => void;
}

/**
 * Hook for lazy loading components based on intersection observer
 */
export function useLazyLoading(options: LazyLoadingOptions = {}): LazyLoadingResult {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
    delay = 0,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const forceLoad = useCallback(() => {
    setIsVisible(true);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if IntersectionObserver is supported
    if (!window.IntersectionObserver) {
      // Fallback for browsers without IntersectionObserver support
      forceLoad();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          
          if (delay > 0) {
            setTimeout(() => {
              setIsLoaded(true);
            }, delay);
          } else {
            setIsLoaded(true);
          }

          if (triggerOnce && observerRef.current) {
            observerRef.current.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
          setIsLoaded(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current = observer;
    observer.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, triggerOnce, delay, forceLoad]);

  return {
    isVisible,
    isLoaded,
    ref,
    forceLoad,
  };
}

/**
 * Hook for lazy loading multiple widgets with priority ordering
 */
export function useLazyWidgetLoading(
  widgets: string[],
  criticalWidgets: string[] = [],
  options: LazyLoadingOptions = {}
) {
  const [loadedWidgets, setLoadedWidgets] = useState<Set<string>>(
    new Set(criticalWidgets)
  );
  const [visibleWidgets, setVisibleWidgets] = useState<Set<string>>(new Set());
  const widgetRefs = useRef<Map<string, React.RefObject<HTMLElement>>>(new Map());

  // Initialize refs for all widgets
  useEffect(() => {
    widgets.forEach(widget => {
      if (!widgetRefs.current.has(widget)) {
        widgetRefs.current.set(widget, { current: null });
      }
    });
  }, [widgets]);

  const getWidgetRef = useCallback((widgetId: string) => {
    if (!widgetRefs.current.has(widgetId)) {
      widgetRefs.current.set(widgetId, { current: null });
    }
    return widgetRefs.current.get(widgetId)!;
  }, []);

  const isWidgetLoaded = useCallback((widgetId: string) => {
    return loadedWidgets.has(widgetId);
  }, [loadedWidgets]);

  const isWidgetVisible = useCallback((widgetId: string) => {
    return visibleWidgets.has(widgetId);
  }, [visibleWidgets]);

  const loadWidget = useCallback((widgetId: string) => {
    setLoadedWidgets(prev => new Set([...prev, widgetId]));
  }, []);

  const setWidgetVisible = useCallback((widgetId: string, visible: boolean) => {
    setVisibleWidgets(prev => {
      const newSet = new Set(prev);
      if (visible) {
        newSet.add(widgetId);
      } else {
        newSet.delete(widgetId);
      }
      return newSet;
    });
  }, []);

  // Set up intersection observers for non-critical widgets
  useEffect(() => {
    const nonCriticalWidgets = widgets.filter(w => !criticalWidgets.includes(w));
    const observers: IntersectionObserver[] = [];

    if (window.IntersectionObserver) {
      nonCriticalWidgets.forEach(widgetId => {
        const ref = getWidgetRef(widgetId);
        if (ref.current) {
          const observer = new IntersectionObserver(
            (entries) => {
              const [entry] = entries;
              if (entry.isIntersecting) {
                setWidgetVisible(widgetId, true);
                
                if (options.delay) {
                  setTimeout(() => {
                    loadWidget(widgetId);
                  }, options.delay);
                } else {
                  loadWidget(widgetId);
                }

                if (options.triggerOnce !== false) {
                  observer.unobserve(entry.target);
                }
              } else if (options.triggerOnce === false) {
                setWidgetVisible(widgetId, false);
              }
            },
            {
              threshold: options.threshold || 0.1,
              rootMargin: options.rootMargin || '50px',
            }
          );

          observer.observe(ref.current);
          observers.push(observer);
        }
      });
    } else {
      // Fallback: load all widgets immediately
      nonCriticalWidgets.forEach(widgetId => {
        setWidgetVisible(widgetId, true);
        loadWidget(widgetId);
      });
    }

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [widgets, criticalWidgets, options, getWidgetRef, setWidgetVisible, loadWidget]);

  return {
    getWidgetRef,
    isWidgetLoaded,
    isWidgetVisible,
    loadWidget,
    loadedWidgets: Array.from(loadedWidgets),
    visibleWidgets: Array.from(visibleWidgets),
  };
}