#!/bin/bash

# Zena AI Real Estate PWA - Production Setup Script
# This script sets up the production environment

set -e

echo "========================================="
echo "Zena Production Environment Setup"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run this script as root"
    exit 1
fi

# Check prerequisites
echo "Checking prerequisites..."

command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed. Aborting."; exit 1; }
command -v psql >/dev/null 2>&1 || { print_error "PostgreSQL client is required but not installed. Aborting."; exit 1; }
command -v redis-cli >/dev/null 2>&1 || { print_error "Redis client is required but not installed. Aborting."; exit 1; }

print_success "All prerequisites are installed"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js version is compatible: $(node -v)"

# Create necessary directories
echo ""
echo "Creating directory structure..."
mkdir -p logs
mkdir -p backups
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p nginx/conf.d
print_success "Directory structure created"

# Check if .env file exists
echo ""
if [ ! -f "packages/backend/.env" ]; then
    print_warning ".env file not found in packages/backend/"
    echo "Creating .env from .env.example..."
    
    if [ -f "packages/backend/.env.example" ]; then
        cp packages/backend/.env.example packages/backend/.env
        print_warning "Please edit packages/backend/.env with your production values"
        read -p "Press enter to continue after editing .env file..."
    else
        print_error ".env.example not found. Please create .env manually"
        exit 1
    fi
else
    print_success ".env file found"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm ci
print_success "Root dependencies installed"

cd packages/backend
npm ci
print_success "Backend dependencies installed"

cd ../frontend
npm ci
print_success "Frontend dependencies installed"

cd ../..

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
cd packages/backend
npx prisma generate
print_success "Prisma client generated"
cd ../..

# Database setup
echo ""
read -p "Do you want to run database migrations? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running database migrations..."
    cd packages/backend
    npx prisma migrate deploy
    print_success "Database migrations completed"
    cd ../..
fi

# Build backend
echo ""
echo "Building backend..."
cd packages/backend
npm run build
print_success "Backend built successfully"
cd ../..

# Build frontend
echo ""
echo "Building frontend..."
cd packages/frontend
npm run build
print_success "Frontend built successfully"
cd ../..

# Generate VAPID keys for push notifications
echo ""
read -p "Do you want to generate VAPID keys for push notifications? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Generating VAPID keys..."
    cd packages/backend
    node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log('Public Key:', keys.publicKey); console.log('Private Key:', keys.privateKey);"
    print_warning "Please add these keys to your .env file"
    cd ../..
fi

# Setup PM2
echo ""
read -p "Do you want to setup PM2 for process management? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        sudo npm install -g pm2
    fi
    
    echo "Starting backend with PM2..."
    pm2 start ecosystem.config.js
    pm2 save
    
    echo "Setting up PM2 startup script..."
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
    
    print_success "PM2 configured successfully"
fi

# Setup SSL certificates
echo ""
read -p "Do you want to setup SSL certificates with Let's Encrypt? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your domain name (e.g., api.yourdomain.com): " DOMAIN
    read -p "Enter your email address: " EMAIL
    
    if command -v certbot &> /dev/null; then
        echo "Obtaining SSL certificate..."
        sudo certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive
        print_success "SSL certificate obtained"
    else
        print_warning "Certbot not installed. Please install certbot first:"
        echo "  sudo apt-get install certbot"
    fi
fi

# Setup Nginx
echo ""
read -p "Do you want to setup Nginx reverse proxy? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v nginx &> /dev/null; then
        echo "Copying Nginx configuration..."
        sudo cp nginx/conf.d/zena-api.conf /etc/nginx/sites-available/zena-api
        sudo ln -sf /etc/nginx/sites-available/zena-api /etc/nginx/sites-enabled/
        
        echo "Testing Nginx configuration..."
        sudo nginx -t
        
        echo "Reloading Nginx..."
        sudo systemctl reload nginx
        
        print_success "Nginx configured successfully"
    else
        print_warning "Nginx not installed. Please install nginx first:"
        echo "  sudo apt-get install nginx"
    fi
fi

# Setup monitoring
echo ""
read -p "Do you want to setup monitoring with PM2? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v pm2 &> /dev/null; then
        echo "Installing PM2 monitoring modules..."
        pm2 install pm2-logrotate
        pm2 set pm2-logrotate:max_size 100M
        pm2 set pm2-logrotate:retain 7
        print_success "PM2 monitoring configured"
    fi
fi

# Setup backup cron job
echo ""
read -p "Do you want to setup automated database backups? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating backup script..."
    cat > scripts/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U zena_user zena_production | gzip > $BACKUP_DIR/zena_$DATE.sql.gz
find $BACKUP_DIR -name "zena_*.sql.gz" -mtime +30 -delete
EOF
    
    chmod +x scripts/backup-database.sh
    
    echo "Adding cron job..."
    (crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/scripts/backup-database.sh") | crontab -
    
    print_success "Backup cron job configured"
fi

# Final checks
echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Verify your .env configuration"
echo "2. Test the backend: curl http://localhost:3000/api/health"
echo "3. Deploy frontend to S3/CloudFront"
echo "4. Configure DNS records"
echo "5. Test the full application"
echo ""
print_success "Production environment is ready!"
