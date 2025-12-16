import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw-custom.js',
      registerType: 'prompt',
      injectRegister: false, // We'll register manually
      manifest: {
        name: 'Zena AI Real Estate Assistant',
        short_name: 'Zena',
        description: 'AI-powered chief of staff for residential real estate agents',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2563eb',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['business', 'productivity'],
      },
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png', 'offline.html'],
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React vendor bundle
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Critical UI components (loaded immediately)
          'ui-core': [
            './src/components/Navigation/Navigation',
            './src/components/BottomNavigation/BottomNavigation',
            './src/components/OfflineIndicator/OfflineIndicator',
            './src/components/ThemeProvider/ThemeProvider',
            './src/components/ErrorBoundary/ErrorBoundary',
          ],
          // Foundation design system components
          'ui-foundation': [
            './src/components/Foundation/Button/Button',
            './src/components/Foundation/Card/Card',
            './src/components/Foundation/Input/Input',
            './src/components/Foundation/Typography/Typography',
            './src/components/Foundation/Layout/Layout',
          ],
          // Dashboard widgets (lazy loaded)
          'dashboard-widgets': [
            './src/components/WeatherTimeWidget/WeatherTimeWidget',
            './src/components/SmartSummaryWidget/SmartSummaryWidget',
            './src/components/PriorityNotificationsPanel/PriorityNotificationsPanel',
            './src/components/QuickActionsPanel/QuickActionsPanel',
            './src/components/CalendarWidget/CalendarWidget',
          ],
          // Data visualization components (lazy loaded)
          'data-viz': [
            './src/components/DataVisualization/Chart',
            './src/components/DataVisualization/DealPipelineChart',
            './src/components/DataVisualization/ResponseTimeTrendChart',
          ],
          // Utility hooks and services
          'utils': [
            './src/utils/accessibility',
            './src/utils/performance',
            './src/utils/offlineStorage',
            './src/hooks/useAccessibility',
            './src/hooks/useLazyLoading',
            './src/hooks/useKeyboardNavigation',
          ],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Generate source maps for production debugging
    sourcemap: true,
    // Target modern browsers for smaller bundles
    target: 'es2020',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
