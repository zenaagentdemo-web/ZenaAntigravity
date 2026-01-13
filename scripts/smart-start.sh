#!/bin/bash

# Zena Smart Startup Script
# Automatically detects and fixes cache issues

echo "🔍 Checking for cache corruption..."

# Function to check if Vite cache is corrupted
check_vite_cache() {
    if [ -d "packages/frontend/.vite" ]; then
        # Check if .vite directory is older than package.json (indicates stale cache)
        if [ "packages/frontend/.vite" -ot "packages/frontend/package.json" ]; then
            echo "⚠️  Detected stale Vite cache"
            return 1
        fi
        
        # Check for common corruption indicators
        if [ -f "packages/frontend/.vite/deps/_metadata.json" ]; then
            if ! grep -q "react" "packages/frontend/.vite/deps/_metadata.json" 2>/dev/null; then
                echo "⚠️  Detected corrupted Vite metadata"
                return 1
            fi
        fi
    fi
    return 0
}

# Function to clean frontend cache
clean_frontend_cache() {
    echo "🧹 Cleaning frontend cache..."
    cd packages/frontend
    rm -rf .vite node_modules/.cache
    # Keep node_modules but clear problematic cache
    if [ -d "node_modules" ]; then
        find node_modules -name ".cache" -type d -exec rm -rf {} + 2>/dev/null || true
    fi
    cd ../..
}

# Function to ensure fresh dependencies
ensure_fresh_deps() {
    echo "📦 Ensuring fresh dependencies..."
    
    # Backend
    cd packages/backend
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        echo "Installing backend dependencies..."
        npm install
    fi
    cd ../..
    
    # Frontend
    cd packages/frontend
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    cd ../..
}

# Stop any running processes
echo "🛑 Stopping existing processes..."
pkill -f "npm run dev" 2>/dev/null || true
sleep 2

# Check and clean if needed
if ! check_vite_cache; then
    clean_frontend_cache
fi

# Ensure dependencies are fresh
ensure_fresh_deps

echo "✅ Cache check complete!"
echo ""
echo "🚀 Starting servers..."

# Start backend
echo "Starting backend..."
cd packages/backend
npm run dev &
BACKEND_PID=$!
cd ../..

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd packages/frontend
npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "✅ Servers started successfully!"
echo "Backend PID: $BACKEND_PID (http://localhost:3000)"
echo "Frontend PID: $FRONTEND_PID (http://localhost:5173)"
echo ""
echo "📧 Gmail OAuth ready at: http://localhost:5173/settings"
echo ""
echo "💡 This script automatically prevents cache issues!"
echo "To stop servers: kill $BACKEND_PID $FRONTEND_PID"