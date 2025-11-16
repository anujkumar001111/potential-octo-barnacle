# Memory Usage Guide

## 📊 Expected Memory Usage

### Development Mode (Current)
```bash
pnpm run dev
```
**Memory**: ~1.4 GB
**Why**: Hot reload, watchers, source maps, unminified code
**Use When**: Actively developing and need instant feedback

### Production Mode (Optimized)
```bash
pnpm run build:production
pnpm run start:production
```
**Memory**: ~400-600 MB (65% reduction!)
**Why**: No watchers, minified code, optimized bundles
**Use When**: Testing final build or daily usage

## 🚀 Quick Commands

### First Time Setup:
```bash
# Build production version
pnpm run build:production
```

### Daily Usage (Low Memory):
```bash
# Start production app (uses ~400-600 MB)
pnpm run start:production
```

### Development (High Memory):
```bash
# Start dev mode (uses ~1.4 GB)
pnpm run dev
```

### Clean Restart:
```bash
# Kill all processes and restart
pnpm run dev:clean
```

## 💡 Memory Comparison

| Mode | Memory | Startup | Hot Reload | Use Case |
|------|--------|---------|------------|----------|
| **Development** | 1.4 GB | 30-40s | ✅ Yes | Active coding |
| **Production** | 400-600 MB | 10-15s | ❌ No | Daily usage |

## 🎯 Recommendation

**For daily use**: Build once, then use production mode
```bash
# Build (do this once or when code changes)
pnpm run build:production

# Start (do this every day)
pnpm run start:production
```

**For development**: Use dev mode only when actively coding
```bash
pnpm run dev
```

## ⚡ Pro Tips

1. **Build production version on Friday** → Use all week with low memory
2. **Only use dev mode** when making code changes
3. **Close dev server** when not coding (saves 1GB RAM)
4. **Use production mode** for demos and testing

## 🔧 Troubleshooting

### If production build fails:
```bash
# Increase build memory temporarily
NODE_OPTIONS="--max-old-space-size=4096" pnpm run build:production
```

### If app crashes in production:
```bash
# Check logs
cat ~/.pm2/logs/electron-error.log
```

### If memory still high:
```bash
# Check what's using memory
ps aux | grep -E "(node|electron)" | awk '{print $6/1024 " MB - " $11}'
```
