#!/bin/bash

# Zena Clean Startup Script
# Prevents React hooks errors by clearing Vite cache

echo "🧹 Cleaning frontend cache to prevent React hooks errors..."

# Stop any running processes
echo "Stopping existing processes..."
pkill -f "npm run dev" || true

# Clean frontend cache and node_modules
echo "Cleaning frontend cache..."
cd packages/frontend
rm -rf .vite node_modules
npm install
cd ../..

# Clean backend node_modules if needed
echo "Ensuring backend dependencies are fresh..."
cd packages/backend
npm install
cd ../..

echo "✅ Clean startup complete!"
echo ""
echo "🚀 Starting servers..."
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo ""

# Start backend
echo "Starting backend..."
cd packages/backend
npm run dev &
BACKEND_PID=$!
cd ../..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd packages/frontend
npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "✅ Servers started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "📧 Gmail OAuth ready at: http://localhost:5173/settings"
echo ""
echo "⚠️  If you see a blank page:"
echo "   1. Clear browser site data (DevTools → Application → Storage → Clear site data)"
echo "   2. Hard refresh (Cmd+Shift+R)"
echo ""
echo "To stop servers: kill $BACKEND_PID $FRONTEND_PID"