module.exports = {
  apps: [
    {
      name: 'zena-api',
      script: './packages/backend/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // Logging
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process management
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Advanced features
      instance_var: 'INSTANCE_ID',
      
      // Cron restart (optional - restart at 3 AM daily)
      cron_restart: '0 3 * * *',
      
      // Source map support
      source_map_support: true,
      
      // Post-deploy hooks
      post_update: ['npm install', 'npx prisma generate', 'npm run build'],
      
      // Health check
      health_check: {
        url: 'http://localhost:3000/api/health',
        interval: 30000,
        timeout: 5000
      }
    },
    
    // Background worker for email sync
    {
      name: 'zena-sync-worker',
      script: './packages/backend/dist/workers/sync-worker.js',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'sync'
      },
      
      error_file: './logs/sync-worker-err.log',
      out_file: './logs/sync-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '512M',
      
      watch: false,
      kill_timeout: 5000
    },
    
    // Background worker for AI processing
    {
      name: 'zena-ai-worker',
      script: './packages/backend/dist/workers/ai-worker.js',
      instances: 2,
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'ai'
      },
      
      error_file: './logs/ai-worker-err.log',
      out_file: './logs/ai-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      watch: false,
      kill_timeout: 5000
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['api.yourdomain.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/zena.git',
      path: '/var/www/zena',
      
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      
      ssh_options: ['StrictHostKeyChecking=no', 'PasswordAuthentication=no'],
      
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: 'deploy',
      host: ['staging.yourdomain.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/zena.git',
      path: '/var/www/zena-staging',
      
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};
