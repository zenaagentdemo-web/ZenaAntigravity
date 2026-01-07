import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './src/test/setup.ts',
    env: {
      // Ensure test environment is set
      NODE_ENV: 'test',
    },
    // Load test environment variables
    environmentOptions: {
      env: {
        DOTENV_CONFIG_PATH: resolve(__dirname, '.env.test'),
      },
    },
    // Increase timeout for database and AI operations
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
