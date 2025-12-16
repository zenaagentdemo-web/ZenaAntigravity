/**
 * Animation Performance Monitoring and Throttling Utility
 * 
 * Implements frame rate monitoring and limits concurrent animations
 * for performance optimization.
 * 
 * Requirements: 7.1, 7.2
 */

export interface AnimationPerformanceConfig {
  /** Maximum concurrent animations allowed */
  maxConcurrentAnimations: number;
  /** Target frame rate (fps) */
  targetFrameRate: number;
  /** Minimum frame rate before throttling kicks in */
  minFrameRate: number;
  /** Enable performance monitoring */
  enableMonitoring: boolean;
}

export interface FrameRateMetrics {
  currentFPS: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  frameCount: number;
  droppedFrames: number;
  measurementDuration: number;
}

export interface AnimationMetrics {
  activeAnimations: number;
  totalAnimations: number;
  throttledAnimations: number;
  averageAnimationDuration: number;
  frameRateMetrics: FrameRateMetrics;
}

export class AnimationPerformanceMonitor {
  private config: AnimationPerformanceConfig = {
    maxConcurrentAnimations: 3,
    targetFrameRate: 60,
    minFrameRate: 55,
    enableMonitoring: true
  };

  private activeAnimations = new Set<string>();
  private animationQueue: Array<() => void> = [];
  private frameRateHistory: number[] = [];
  private lastFrameTime = 0;
  private frameCount = 0;
  private measurementStartTime = 0;
  private animationDurations: number[] = [];
  private throttledCount = 0;
  private totalAnimationCount = 0;
  private isMonitoring = false;
  private rafId: number | null = null;

  constructor(config?: Partial<AnimationPerformanceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }
  }

  /**
   * Start frame rate monitoring
   */
  private startMonitoring(): void {
    if (this.isMonitoring || typeof window === 'undefined') {
      return;
    }

    this.isMonitoring = true;
    this.measurementStartTime = performance.now();
    this.lastFrameTime = this.measurementStartTime;
    this.frameCount = 0;
    this.frameRateHistory = [];

    const measureFrame = (currentTime: number) => {
      if (!this.isMonitoring) return;

      // Calculate frame rate
      const deltaTime = currentTime - this.lastFrameTime;
      if (deltaTime > 0) {
        const fps = 1000 / deltaTime;
        this.frameRateHistory.push(fps);
        
        // Keep only last 60 frames for rolling average
        if (this.frameRateHistory.length > 60) {
          this.frameRateHistory.shift();
        }
      }

      this.lastFrameTime = currentTime;
      this.frameCount++;

      // Process queued animations if performance allows
      this.processAnimationQueue();

      this.rafId = requestAnimationFrame(measureFrame);
    };

    this.rafId = requestAnimationFrame(measureFrame);
  }

  /**
   * Stop frame rate monitoring
   */
  private stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Process queued animations based on current performance
   */
  private processAnimationQueue(): void {
    const currentFPS = this.getCurrentFrameRate();
    const canRunMoreAnimations = 
      this.activeAnimations.size < this.config.maxConcurrentAnimations &&
      currentFPS >= this.config.minFrameRate;

    if (canRunMoreAnimations && this.animationQueue.length > 0) {
      const nextAnimation = this.animationQueue.shift();
      if (nextAnimation) {
        nextAnimation();
      }
    }
  }

  /**
   * Get current frame rate
   */
  getCurrentFrameRate(): number {
    if (this.frameRateHistory.length === 0) {
      return this.config.targetFrameRate;
    }

    // Return average of last 10 frames for more stable reading
    const recentFrames = this.frameRateHistory.slice(-10);
    return recentFrames.reduce((sum, fps) => sum + fps, 0) / recentFrames.length;
  }

  /**
   * Get comprehensive frame rate metrics
   */
  getFrameRateMetrics(): FrameRateMetrics {
    const currentTime = performance.now();
    const measurementDuration = currentTime - this.measurementStartTime;

    if (this.frameRateHistory.length === 0) {
      return {
        currentFPS: 0,
        averageFPS: 0,
        minFPS: 0,
        maxFPS: 0,
        frameCount: this.frameCount,
        droppedFrames: 0,
        measurementDuration
      };
    }

    const currentFPS = this.getCurrentFrameRate();
    const averageFPS = this.frameRateHistory.reduce((sum, fps) => sum + fps, 0) / this.frameRateHistory.length;
    const minFPS = Math.min(...this.frameRateHistory);
    const maxFPS = Math.max(...this.frameRateHistory);
    
    // Estimate dropped frames based on target frame rate
    const expectedFrames = (measurementDuration / 1000) * this.config.targetFrameRate;
    const droppedFrames = Math.max(0, expectedFrames - this.frameCount);

    return {
      currentFPS,
      averageFPS,
      minFPS,
      maxFPS,
      frameCount: this.frameCount,
      droppedFrames,
      measurementDuration
    };
  }

  /**
   * Register an animation and check if it should run immediately or be queued
   */
  requestAnimation(animationId: string, animationFn: () => void): boolean {
    this.totalAnimationCount++;

    // Check if we can run the animation immediately
    const currentFPS = this.getCurrentFrameRate();
    const canRunImmediately = 
      this.activeAnimations.size < this.config.maxConcurrentAnimations &&
      currentFPS >= this.config.minFrameRate;

    if (canRunImmediately) {
      this.startAnimation(animationId, animationFn);
      return true;
    } else {
      // Queue the animation for later
      this.animationQueue.push(() => this.startAnimation(animationId, animationFn));
      this.throttledCount++;
      return false;
    }
  }

  /**
   * Start an animation and track its lifecycle
   */
  private startAnimation(animationId: string, animationFn: () => void): void {
    if (this.activeAnimations.has(animationId)) {
      return; // Animation already running
    }

    this.activeAnimations.add(animationId);
    const startTime = performance.now();

    // Wrap the animation function to track completion
    const wrappedFn = () => {
      try {
        animationFn();
      } finally {
        // Animation completed, remove from active set
        this.completeAnimation(animationId, startTime);
      }
    };

    // Execute the animation
    wrappedFn();
  }

  /**
   * Mark an animation as completed
   */
  completeAnimation(animationId: string, startTime: number): void {
    this.activeAnimations.delete(animationId);
    
    const duration = performance.now() - startTime;
    this.animationDurations.push(duration);
    
    // Keep only last 50 durations for average calculation
    if (this.animationDurations.length > 50) {
      this.animationDurations.shift();
    }
  }

  /**
   * Force complete an animation (for cleanup)
   */
  forceCompleteAnimation(animationId: string): void {
    this.activeAnimations.delete(animationId);
  }

  /**
   * Get comprehensive animation metrics
   */
  getAnimationMetrics(): AnimationMetrics {
    const averageAnimationDuration = this.animationDurations.length > 0
      ? this.animationDurations.reduce((sum, duration) => sum + duration, 0) / this.animationDurations.length
      : 0;

    return {
      activeAnimations: this.activeAnimations.size,
      totalAnimations: this.totalAnimationCount,
      throttledAnimations: this.throttledCount,
      averageAnimationDuration,
      frameRateMetrics: this.getFrameRateMetrics()
    };
  }

  /**
   * Check if performance is within acceptable limits
   */
  isPerformanceAcceptable(): boolean {
    const currentFPS = this.getCurrentFrameRate();
    return currentFPS >= this.config.minFrameRate;
  }

  /**
   * Get the number of animations that can still be started
   */
  getAvailableAnimationSlots(): number {
    return Math.max(0, this.config.maxConcurrentAnimations - this.activeAnimations.size);
  }

  /**
   * Clear all queued animations
   */
  clearAnimationQueue(): void {
    this.animationQueue = [];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnimationPerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enableMonitoring !== undefined) {
      if (newConfig.enableMonitoring && !this.isMonitoring) {
        this.startMonitoring();
      } else if (!newConfig.enableMonitoring && this.isMonitoring) {
        this.stopMonitoring();
      }
    }
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.frameRateHistory = [];
    this.animationDurations = [];
    this.frameCount = 0;
    this.throttledCount = 0;
    this.totalAnimationCount = 0;
    this.measurementStartTime = performance.now();
    this.lastFrameTime = this.measurementStartTime;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.activeAnimations.clear();
    this.animationQueue = [];
    this.frameRateHistory = [];
    this.animationDurations = [];
  }
}

// Global instance
export const animationPerformanceMonitor = new AnimationPerformanceMonitor();

/**
 * Hook for managing animation performance in components
 */
export const useAnimationPerformance = () => {
  const requestAnimation = (animationId: string, animationFn: () => void): boolean => {
    return animationPerformanceMonitor.requestAnimation(animationId, animationFn);
  };

  const completeAnimation = (animationId: string, startTime: number): void => {
    animationPerformanceMonitor.completeAnimation(animationId, startTime);
  };

  const getMetrics = (): AnimationMetrics => {
    return animationPerformanceMonitor.getAnimationMetrics();
  };

  const isPerformanceAcceptable = (): boolean => {
    return animationPerformanceMonitor.isPerformanceAcceptable();
  };

  return {
    requestAnimation,
    completeAnimation,
    getMetrics,
    isPerformanceAcceptable,
    getCurrentFrameRate: () => animationPerformanceMonitor.getCurrentFrameRate(),
    getAvailableSlots: () => animationPerformanceMonitor.getAvailableAnimationSlots()
  };
};

/**
 * Decorator for throttling animations based on performance
 */
export const withAnimationThrottling = <T extends (...args: any[]) => void>(
  animationFn: T,
  animationId: string
): T => {
  return ((...args: any[]) => {
    const wasStarted = animationPerformanceMonitor.requestAnimation(
      animationId,
      () => animationFn(...args)
    );

    if (!wasStarted && process.env.NODE_ENV === 'development') {
      console.log(`[Animation] Throttled animation: ${animationId}`);
    }

    return wasStarted;
  }) as T;
};

/**
 * CSS containment utility for better animation performance
 */
export const applyAnimationOptimizations = (element: HTMLElement): void => {
  // Apply CSS containment for better performance
  element.style.contain = 'layout style paint';
  
  // Promote to composite layer for smooth animations
  element.style.willChange = 'transform, opacity';
  
  // Use hardware acceleration
  element.style.transform = element.style.transform || 'translateZ(0)';
};

/**
 * Clean up animation optimizations
 */
export const cleanupAnimationOptimizations = (element: HTMLElement): void => {
  element.style.willChange = 'auto';
  
  // Remove translateZ(0) if it was only added for hardware acceleration
  if (element.style.transform === 'translateZ(0)') {
    element.style.transform = '';
  }
};

export default animationPerformanceMonitor;