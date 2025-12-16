# Zena AI Real Estate PWA - Deployment Guide

This guide covers the deployment infrastructure setup for the Zena AI Real Estate PWA application.

## Architecture Overview

The application consists of:
- **Frontend**: React PWA (Progressive Web App)
- **Backend**: Node.js/Express API server
- **Database**: PostgreSQL
- **Cache/Queue**: Redis
- **Storage**: S3-compatible object storage
- **CDN**: CloudFront or equivalent

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- AWS account (or equivalent cloud provider)
- Domain name with DNS access
- SSL/TLS certificate

## Environment Variables

### Backend Environment Variables

Create a `.env` file in `packages/backend/` with the following variables:

```bash
# Application
NODE_ENV=production
PORT=3000
API_URL=https://api.yourdomain.com

# Database
DATABASE_URL=postgresql://username:password@host:5432/zena_production
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://username:password@host:6379
REDIS_TLS_ENABLED=true

# JWT Authentication
JWT_SECRET=your-secure-random-secret-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-secure-refresh-secret-key-here
JWT_REFRESH_EXPIRES_IN=30d

# OAuth - Gmail
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/accounts/email/callback

# OAuth - Microsoft
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_REDIRECT_URI=https://api.yourdomain.com/api/accounts/email/callback

# LLM API (OpenAI or Anthropic)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview
# OR
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Speech Services
OPENAI_WHISPER_API_KEY=your-openai-api-key
GOOGLE_SPEECH_API_KEY=your-google-speech-api-key

# S3 Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=zena-production-storage
S3_ENDPOINT=https://s3.amazonaws.com

# Email Sending (for notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@yourdomain.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://yourdomain.com
```

### Frontend Environment Variables

Create a `.env.production` file in `packages/frontend/` with:

```bash
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
VITE_SENTRY_DSN=your-frontend-sentry-dsn
VITE_APP_VERSION=1.0.0
```

## Database Setup

### 1. Create Production Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE zena_production;
CREATE USER zena_user WITH ENCRYPTED PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE zena_production TO zena_user;
```

### 2. Run Migrations

```bash
cd packages/backend
npm run prisma:migrate:deploy
```

### 3. Configure Connection Pooling

For production, use a connection pooler like PgBouncer:

```ini
# pgbouncer.ini
[databases]
zena_production = host=localhost port=5432 dbname=zena_production

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

## Redis Setup

### 1. Install and Configure Redis

```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf
```

Key configuration changes:
```conf
# Bind to localhost and private IP
bind 127.0.0.1 10.0.1.5

# Enable password authentication
requirepass your-secure-redis-password

# Enable persistence
save 900 1
save 300 10
save 60 10000

# Enable AOF
appendonly yes
appendfsync everysec

# Set max memory and eviction policy
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### 2. Enable TLS (Optional but Recommended)

```conf
# Redis TLS configuration
tls-port 6380
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
tls-ca-cert-file /path/to/ca.crt
```

## S3 Storage Setup

### 1. Create S3 Bucket

```bash
aws s3 mb s3://zena-production-storage --region us-east-1
```

### 2. Configure Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowZenaAppAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:user/zena-app"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::zena-production-storage/*"
    }
  ]
}
```

### 3. Enable CORS

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 4. Configure Lifecycle Rules

```json
{
  "Rules": [
    {
      "Id": "DeleteOldExports",
      "Status": "Enabled",
      "Prefix": "exports/",
      "Expiration": {
        "Days": 7
      }
    },
    {
      "Id": "TransitionOldVoiceNotes",
      "Status": "Enabled",
      "Prefix": "voice-notes/",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

## HTTPS/TLS Configuration

### 1. Obtain SSL Certificate

Using Let's Encrypt with Certbot:

```bash
sudo apt-get install certbot
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com
```

### 2. Configure Nginx as Reverse Proxy

```nginx
# /etc/nginx/sites-available/zena-api
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Auto-Renewal Setup

```bash
# Add cron job for certificate renewal
sudo crontab -e

# Add this line:
0 0 * * * certbot renew --quiet && systemctl reload nginx
```

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint

  build-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd packages/backend
          npm ci
      
      - name: Build
        run: |
          cd packages/backend
          npm run build
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: backend-dist
          path: packages/backend/dist

  build-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd packages/frontend
          npm ci
      
      - name: Build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_WS_URL: ${{ secrets.VITE_WS_URL }}
          VITE_VAPID_PUBLIC_KEY: ${{ secrets.VITE_VAPID_PUBLIC_KEY }}
        run: |
          cd packages/frontend
          npm run build
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: frontend-dist
          path: packages/frontend/dist

  deploy-backend:
    needs: build-backend
    runs-on: ubuntu-latest
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: backend-dist
          path: dist
      
      - name: Deploy to server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          source: "dist/*"
          target: "/var/www/zena-api"
      
      - name: Restart backend service
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /var/www/zena-api
            npm install --production
            pm2 restart zena-api

  deploy-frontend:
    needs: build-frontend
    runs-on: ubuntu-latest
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: frontend-dist
          path: dist
      
      - name: Deploy to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --delete --cache-control max-age=31536000
        env:
          AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: 'us-east-1'
          SOURCE_DIR: 'dist'
      
      - name: Invalidate CloudFront
        uses: chetan/invalidate-cloudfront-action@v2
        env:
          DISTRIBUTION: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
          PATHS: '/*'
          AWS_REGION: 'us-east-1'
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Backend Deployment

### 1. Install PM2 Process Manager

```bash
npm install -g pm2
```

### 2. Create PM2 Ecosystem File

Create `ecosystem.config.js` in the project root:

```javascript
module.exports = {
  apps: [{
    name: 'zena-api',
    script: './packages/backend/dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

### 3. Start Backend Service

```bash
cd /var/www/zena-api
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Configure Log Rotation

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
```

## Frontend Deployment

### 1. Build Frontend

```bash
cd packages/frontend
npm run build
```

### 2. Deploy to S3

```bash
aws s3 sync dist/ s3://zena-production-frontend --delete
```

### 3. Configure CloudFront Distribution

```json
{
  "Origins": [{
    "Id": "S3-zena-frontend",
    "DomainName": "zena-production-frontend.s3.amazonaws.com",
    "S3OriginConfig": {
      "OriginAccessIdentity": "origin-access-identity/cloudfront/XXXXX"
    }
  }],
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-zena-frontend",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
  },
  "CustomErrorResponses": [{
    "ErrorCode": 404,
    "ResponseCode": 200,
    "ResponsePagePath": "/index.html"
  }],
  "ViewerCertificate": {
    "AcmCertificateArn": "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID",
    "SslSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  }
}
```

## Monitoring and Logging

### 1. Set Up Sentry

```bash
# Backend
npm install @sentry/node @sentry/tracing

# Frontend
npm install @sentry/react @sentry/tracing
```

### 2. Configure Application Monitoring

Backend (`packages/backend/src/index.ts`):
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

Frontend (`packages/frontend/src/main.tsx`):
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});
```

### 3. Set Up CloudWatch Logs (AWS)

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
```

## Health Checks and Monitoring

### 1. Health Check Endpoint

The backend includes a health check endpoint at `/api/health`:

```bash
curl https://api.yourdomain.com/api/health
```

### 2. Set Up Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- StatusCake

Configure alerts for:
- API endpoint availability
- Response time > 5 seconds
- Error rate > 5%

### 3. Database Monitoring

```sql
-- Create monitoring user
CREATE USER monitoring WITH PASSWORD 'monitoring-password';
GRANT pg_monitor TO monitoring;
```

## Backup Strategy

### 1. Database Backups

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U zena_user zena_production | gzip > $BACKUP_DIR/zena_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "zena_*.sql.gz" -mtime +30 -delete
```

Add to crontab:
```bash
0 2 * * * /usr/local/bin/backup-database.sh
```

### 2. S3 Backup

Enable versioning and cross-region replication:

```bash
aws s3api put-bucket-versioning \
  --bucket zena-production-storage \
  --versioning-configuration Status=Enabled
```

## Security Checklist

- [ ] All environment variables are set and secured
- [ ] Database uses strong passwords and is not publicly accessible
- [ ] Redis requires authentication
- [ ] HTTPS/TLS is enabled with valid certificates
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Security headers are set (HSTS, CSP, etc.)
- [ ] OAuth credentials are properly secured
- [ ] S3 bucket policies are restrictive
- [ ] Monitoring and alerting are configured
- [ ] Backups are automated and tested
- [ ] Firewall rules are configured
- [ ] SSH access uses key-based authentication
- [ ] Application logs don't contain sensitive data

## Scaling Considerations

### Horizontal Scaling

1. **Backend**: Use PM2 cluster mode or container orchestration (Kubernetes, ECS)
2. **Database**: Set up read replicas for read-heavy operations
3. **Redis**: Use Redis Cluster for high availability
4. **CDN**: CloudFront automatically scales

### Vertical Scaling

Monitor resource usage and upgrade instance sizes as needed:
- CPU usage > 70% sustained
- Memory usage > 80%
- Database connections approaching max

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Backend service is down
   ```bash
   pm2 status
   pm2 logs zena-api
   ```

2. **Database Connection Errors**: Check connection string and firewall rules
   ```bash
   psql -U zena_user -h localhost -d zena_production
   ```

3. **Redis Connection Errors**: Verify Redis is running
   ```bash
   redis-cli ping
   ```

4. **S3 Upload Failures**: Check IAM permissions and bucket policy

## Post-Deployment Verification

1. Test authentication flow
2. Connect test email account
3. Verify email sync works
4. Test Ask Zena queries
5. Upload test voice note
6. Verify push notifications
7. Test export functionality
8. Check monitoring dashboards
9. Verify backups are running
10. Test disaster recovery procedure

## Support and Maintenance

- Monitor error rates daily
- Review performance metrics weekly
- Update dependencies monthly
- Test backup restoration quarterly
- Review security patches immediately
- Conduct load testing before major releases
