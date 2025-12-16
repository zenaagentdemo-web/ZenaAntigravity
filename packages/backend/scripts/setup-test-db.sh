#!/bin/bash

# Test Database Setup Script
# This script helps set up the test database for running tests

set -e

echo "🧪 Zena Test Database Setup"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.test exists
if [ ! -f ".env.test" ]; then
    echo -e "${RED}Error: .env.test file not found${NC}"
    echo "Please create .env.test file first"
    exit 1
fi

# Load DATABASE_URL from .env.test
export $(grep -v '^#' .env.test | grep DATABASE_URL | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not found in .env.test${NC}"
    exit 1
fi

echo -e "${YELLOW}Using DATABASE_URL: $DATABASE_URL${NC}"
echo ""

# Extract database name from URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📋 Setup Options:"
echo "1. Create test database"
echo "2. Run migrations"
echo "3. Seed test data"
echo "4. Reset test database (drop and recreate)"
echo "5. Full setup (create + migrate + seed)"
echo ""

read -p "Select option (1-5): " option

case $option in
    1)
        echo -e "${YELLOW}Creating test database: $DB_NAME${NC}"
        psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database may already exist"
        echo -e "${GREEN}✓ Database created${NC}"
        ;;
    2)
        echo -e "${YELLOW}Running migrations...${NC}"
        npx prisma migrate deploy
        echo -e "${GREEN}✓ Migrations complete${NC}"
        ;;
    3)
        echo -e "${YELLOW}Seeding test data...${NC}"
        npx prisma db seed
        echo -e "${GREEN}✓ Seed complete${NC}"
        ;;
    4)
        echo -e "${YELLOW}Resetting test database...${NC}"
        read -p "Are you sure? This will delete all data in $DB_NAME (y/N): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            npx prisma migrate reset --force
            echo -e "${GREEN}✓ Database reset complete${NC}"
        else
            echo "Cancelled"
        fi
        ;;
    5)
        echo -e "${YELLOW}Running full setup...${NC}"
        echo ""
        
        echo "Step 1/3: Creating database..."
        psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database may already exist"
        
        echo "Step 2/3: Running migrations..."
        npx prisma migrate deploy
        
        echo "Step 3/3: Seeding data..."
        npx prisma db seed 2>/dev/null || echo "No seed script found (optional)"
        
        echo ""
        echo -e "${GREEN}✓ Full setup complete!${NC}"
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done! You can now run tests with: npm test${NC}"
