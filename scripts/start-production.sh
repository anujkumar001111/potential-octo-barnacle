#!/bin/bash

# Production-optimized startup script with minimal memory

echo "🚀 Starting application in production mode..."
echo ""

# Set production environment with strict memory limits
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=512"
export NEXT_TELEMETRY_DISABLED=1

# Check if build exists
if [ ! -d ".next" ] || [ ! -d "dist/electron" ]; then
  echo "❌ Production build not found!"
  echo ""
  echo "Please run: bash scripts/build-production.sh"
  exit 1
fi

# Start Next.js in production mode on port 5173
echo "🌐 Starting Next.js server on port 5173..."
pnpm exec next start -p 5173 &
NEXT_PID=$!

# Wait for Next.js to be ready
echo "⏳ Waiting for Next.js server..."
sleep 5

# Start Electron
echo "⚡ Starting Electron app..."
pnpm run electron

# Cleanup on exit
trap "kill $NEXT_PID 2>/dev/null" EXIT
