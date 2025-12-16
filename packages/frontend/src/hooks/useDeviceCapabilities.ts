/**
 * useDeviceCapabilities - Detect device performance capabilities
 * Returns recommended settings for animations and particles
 */
import { useState, useEffect } from 'react';

export interface DeviceCapabilities {
    /** Device is considered low-power (older mobile, slow GPU) */
    isLowPower: boolean;
    /** Device is mobile */
    isMobile: boolean;
    /** Device prefers reduced motion */
    prefersReducedMotion: boolean;
    /** Recommended particle count based on device */
    recommendedParticleCount: number;
    /** Device pixel ratio */
    devicePixelRatio: number;
    /** Has touch support */
    hasTouch: boolean;
}

// Rough GPU benchmark using a simple WebGL test
function estimateGPUPerformance(): 'high' | 'medium' | 'low' {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) return 'low';

        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return 'medium';

        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

        // Check for known low-power GPUs
        const lowPowerKeywords = ['intel', 'mali-4', 'mali-t6', 'adreno 3', 'adreno 4', 'powervr sgx'];
        const rendererLower = renderer.toLowerCase();

        if (lowPowerKeywords.some(kw => rendererLower.includes(kw))) {
            return 'low';
        }

        // High-end GPUs
        const highPowerKeywords = ['nvidia', 'radeon', 'geforce', 'adreno 6', 'adreno 7', 'apple gpu', 'mali-g7'];
        if (highPowerKeywords.some(kw => rendererLower.includes(kw))) {
            return 'high';
        }

        return 'medium';
    } catch {
        return 'medium';
    }
}

function detectCapabilities(): DeviceCapabilities {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    // Check for low memory (if available)
    const lowMemory = (navigator as any).deviceMemory ? (navigator as any).deviceMemory < 4 : false;

    // Check hardware concurrency (CPU cores)
    const lowCPU = navigator.hardwareConcurrency ? navigator.hardwareConcurrency < 4 : false;

    // GPU performance
    const gpuPerformance = estimateGPUPerformance();

    // Determine if low-power device
    const isLowPower = prefersReducedMotion || lowMemory || lowCPU || gpuPerformance === 'low' ||
        (isMobile && gpuPerformance !== 'high');

    // Recommended particle count
    let recommendedParticleCount = 500;
    if (prefersReducedMotion) {
        recommendedParticleCount = 0; // No particles for reduced motion
    } else if (isLowPower) {
        recommendedParticleCount = 150; // Minimal particles
    } else if (gpuPerformance === 'medium' || isMobile) {
        recommendedParticleCount = 300; // Moderate particles
    }

    return {
        isLowPower,
        isMobile,
        prefersReducedMotion,
        recommendedParticleCount,
        devicePixelRatio,
        hasTouch,
    };
}

export function useDeviceCapabilities(): DeviceCapabilities {
    const [capabilities, setCapabilities] = useState<DeviceCapabilities>(() => ({
        isLowPower: false,
        isMobile: false,
        prefersReducedMotion: false,
        recommendedParticleCount: 500,
        devicePixelRatio: 1,
        hasTouch: false,
    }));

    useEffect(() => {
        // Detect on mount
        setCapabilities(detectCapabilities());

        // Listen for reduced motion preference changes
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = () => setCapabilities(detectCapabilities());

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return capabilities;
}
