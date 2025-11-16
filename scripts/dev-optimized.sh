#!/bin/bash

# Optimized development script with memory limits

echo "🚀 Starting optimized development environment..."

# Set Node memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Disable telemetry
export NEXT_TELEMETRY_DISABLED=1

# Kill any existing processes
./scripts/kill-dev-processes.sh

# Start with reduced concurrency
pnpm run dev
