# Zena AI Real Estate PWA - Deployment Checklist

Use this checklist to ensure all deployment steps are completed correctly.

## Pre-Deployment

### Infrastructure Setup
- [ ] AWS account created and configured
- [ ] Domain name registered
- [ ] DNS provider configured
- [ ] SSL/TLS certificates obtained
- [ ] PostgreSQL database provisioned
- [ ] Redis instance provisioned
- [ ] S3 buckets created (storage and frontend)
- [ ] CloudFront distribution configured
- [ ] IAM roles and policies created

### Environment Configuration
- [ ] Production `.env` file created in `packages/backend/`
- [ ] Frontend `.env.production` file created in `packages/frontend/`
- [ ] All API keys and secrets generated and stored securely
- [ ] OAuth credentials configured (Google, Microsoft)
- [ ] LLM API keys configured (OpenAI/Anthropic)
- [ ] Speech-to-text API keys configured
- [ ] VAPID keys generated for push notifications
- [ ] Sentry DSN configured for error tracking
- [ ] SMTP credentials configured for email notifications

### Security
- [ ] Strong passwords generated for database and Redis
- [ ] JWT secrets generated (minimum 32 characters)
- [ ] All credentials encrypted at rest
- [ ] HTTPS/TLS enabled for all endpoints
- [ ] CORS origins properly configured
- [ ] Rate limiting configured
- [ ] Security headers configured in Nginx
- [ ] Firewall rules configured
- [ ] SSH key-based authentication enabled
- [ ] Database not publicly accessible
- [ ] Redis authentication enabled

### Code Preparation
- [ ] All tests passing locally
- [ ] Code linted and formatted
- [ ] Dependencies updated and audited (`npm audit`)
- [ ] Production build tested locally
- [ ] Database migrations tested
- [ ] Prisma schema validated

## Deployment

### Database
- [ ] Database created
- [ ] Database user created with appropriate permissions
- [ ] Connection pooling configured (PgBouncer)
- [ ] Database migrations run (`npx prisma migrate deploy`)
- [ ] Database indexes created
- [ ] Database backup strategy configured
- [ ] Database monitoring enabled

### Backend
- [ ] Backend code built (`npm run build`)
- [ ] Dependencies installed (`npm ci --production`)
- [ ] Environment variables set
- [ ] PM2 or process manager configured
- [ ] Backend service started
- [ ] Health check endpoint responding (`/api/health`)
- [ ] Logs directory created and writable
- [ ] Log rotation configured
- [ ] Backend monitoring enabled

### Frontend
- [ ] Frontend code built (`npm run build`)
- [ ] Build artifacts uploaded to S3
- [ ] CloudFront cache invalidated
- [ ] Service worker registered
- [ ] PWA manifest configured
- [ ] PWA icons uploaded
- [ ] Offline functionality tested

### Reverse Proxy (Nginx)
- [ ] Nginx installed and configured
- [ ] SSL certificates installed
- [ ] Nginx configuration tested (`nginx -t`)
- [ ] Nginx service restarted
- [ ] HTTPS redirect working
- [ ] WebSocket proxy working
- [ ] Rate limiting working
- [ ] Security headers present

### CI/CD
- [ ] GitHub Actions workflow configured
- [ ] GitHub secrets configured
- [ ] Deployment pipeline tested
- [ ] Rollback procedure documented
- [ ] Automated tests in pipeline

## Post-Deployment

### Verification
- [ ] Frontend loads correctly (https://yourdomain.com)
- [ ] API health check passes (https://api.yourdomain.com/api/health)
- [ ] User registration works
- [ ] User login works
- [ ] Email OAuth flow works (Gmail)
- [ ] Email OAuth flow works (Microsoft)
- [ ] Calendar OAuth flow works
- [ ] Email sync works
- [ ] Calendar sync works
- [ ] AI classification works
- [ ] Voice note upload and transcription works
- [ ] Ask Zena queries work
- [ ] Search functionality works
- [ ] Export functionality works
- [ ] Push notifications work
- [ ] WebSocket real-time updates work
- [ ] Offline mode works
- [ ] PWA installation works

### Performance
- [ ] Initial load time < 2 seconds
- [ ] API response time < 500ms (average)
- [ ] Database query performance acceptable
- [ ] Redis cache hit rate > 80%
- [ ] CDN cache hit rate > 90%
- [ ] No memory leaks detected
- [ ] CPU usage < 70% under normal load
- [ ] Load testing completed

### Monitoring
- [ ] Sentry error tracking working
- [ ] Application logs being collected
- [ ] Database monitoring enabled
- [ ] Redis monitoring enabled
- [ ] Uptime monitoring configured
- [ ] Alert thresholds configured
- [ ] On-call rotation established
- [ ] Status page created (optional)

### Backup and Recovery
- [ ] Database backup script configured
- [ ] Backup cron job running
- [ ] Backup restoration tested
- [ ] S3 versioning enabled
- [ ] Disaster recovery plan documented
- [ ] RTO and RPO defined

### Documentation
- [ ] Deployment guide updated
- [ ] API documentation published
- [ ] User documentation published
- [ ] Troubleshooting guide created
- [ ] Runbook created for common issues
- [ ] Architecture diagram updated
- [ ] Contact information for support

### Compliance and Legal
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance verified (if applicable)
- [ ] CCPA compliance verified (if applicable)
- [ ] Data retention policy documented
- [ ] Data deletion procedure tested

## Ongoing Maintenance

### Daily
- [ ] Check error rates in Sentry
- [ ] Review application logs
- [ ] Monitor uptime status
- [ ] Check backup completion

### Weekly
- [ ] Review performance metrics
- [ ] Check disk space usage
- [ ] Review security alerts
- [ ] Update dependencies (if needed)

### Monthly
- [ ] Review and rotate logs
- [ ] Test backup restoration
- [ ] Review and update documentation
- [ ] Security audit
- [ ] Performance optimization review

### Quarterly
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Security penetration testing
- [ ] Dependency major version updates
- [ ] Infrastructure cost review

## Rollback Procedure

If deployment fails or critical issues are discovered:

1. **Immediate Actions**
   - [ ] Stop accepting new traffic (update DNS or load balancer)
   - [ ] Notify team and stakeholders
   - [ ] Document the issue

2. **Backend Rollback**
   - [ ] Stop current backend service
   - [ ] Restore previous version from backup
   - [ ] Restart backend service
   - [ ] Verify health check

3. **Frontend Rollback**
   - [ ] Restore previous S3 version
   - [ ] Invalidate CloudFront cache
   - [ ] Verify frontend loads correctly

4. **Database Rollback** (if needed)
   - [ ] Stop backend service
   - [ ] Restore database from backup
   - [ ] Run necessary migrations
   - [ ] Restart backend service

5. **Post-Rollback**
   - [ ] Verify all functionality works
   - [ ] Resume normal traffic
   - [ ] Conduct post-mortem
   - [ ] Document lessons learned

## Emergency Contacts

- **DevOps Lead**: [Name] - [Email] - [Phone]
- **Backend Lead**: [Name] - [Email] - [Phone]
- **Frontend Lead**: [Name] - [Email] - [Phone]
- **Database Admin**: [Name] - [Email] - [Phone]
- **Security Lead**: [Name] - [Email] - [Phone]
- **AWS Support**: [Account Number] - [Support Plan]

## Support Resources

- **Documentation**: https://docs.yourdomain.com
- **Status Page**: https://status.yourdomain.com
- **Monitoring Dashboard**: https://monitoring.yourdomain.com
- **Error Tracking**: https://sentry.io/organizations/your-org
- **CI/CD Pipeline**: https://github.com/your-org/zena/actions

## Sign-Off

Deployment completed by: _________________ Date: _________

Verified by: _________________ Date: _________

Approved by: _________________ Date: _________
