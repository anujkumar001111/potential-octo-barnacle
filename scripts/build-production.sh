#!/bin/bash

echo "🏗️  Building production version..."
echo ""

# Set production environment
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"
export NEXT_TELEMETRY_DISABLED=1

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf dist

# Build Next.js
echo "📦 Building Next.js..."
pnpm run build:next

# Build Electron dependencies
echo "⚡ Building Electron dependencies..."
pnpm run build:deps

echo ""
echo "✅ Production build complete!"
echo ""
echo "To start production app:"
echo "  pnpm run start:production"
