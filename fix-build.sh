#!/bin/bash

echo "🔧 Fixing build issues..."

# Kill existing processes
echo "Stopping existing processes..."
pkill -f "next dev"
pkill -f "vite build"
pkill -f "electron"
pkill -f "nodemon"

# Wait for processes to stop
sleep 2

# Clean build artifacts
echo "Cleaning build artifacts..."
rm -rf .next
rm -rf dist
rm -rf node_modules/.cache

# Rebuild
echo "Rebuilding..."
npm run build:deps

echo "✅ Build fixed! Now run: npm run dev"
