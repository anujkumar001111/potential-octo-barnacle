# Browser Tools Quick Reference

## 🚀 Quick Start

**Total Tools**: 30 (18 new + 12 built-in)
**Status**: ✅ All implemented and ready to use
**Build**: 1.24MB bundle
**Latest**: Phase 6 web search tool now available

---

## 📋 Tool Categories

### 🔍 Content Extraction (6 tools)

```typescript
// Get page as markdown
browser_get_markdown()

// Get all links
browser_read_links()

// Get text content
browser_get_text()

// Navigate forward
browser_go_forward()

// Press keyboard key
browser_press_key({ key: 'Enter' })

// Scroll page
browser_scroll({ amount: 500 }) // positive = down, negative = up
```

### 📑 Tab Management (3 tools)

```typescript
// Open new tab
browser_new_tab({ url: 'https://example.com' })

// Close current tab
browser_close_tab()

// Switch to tab
browser_switch_tab({ index: 0 })
```

### ⚡ Core Interaction (2 tools)

```typescript
// Fast text injection
browser_paste_text({
  selector: '#input',
  text: 'Hello World',
  clearExisting: true
})

// Wait for element
browser_wait_for_element({
  selector: '.loading',
  timeout: 30000,
  state: 'visible'
})
```

### 🎯 Advanced Interaction (3 tools) ⭐ NEW

```typescript
// Get all interactive elements with properties
browser_get_clickable_elements({ 
  includeHidden: false  // default: false
})
// Returns: Array of {index, tagName, type, text, selector, attributes, isVisible, boundingBox}

// Hover over element
browser_hover({ 
  index: 0,  // or selector: '#button'
})

// Select dropdown option
browser_select({
  selector: '#country',
  value: 'United States'  // or by text/index
})
```

### 🔧 Advanced Features (3 tools)

```typescript
// Track downloads
browser_get_download_list()
// Returns: Array of download objects with filename, path, status

// Execute JavaScript (⚠️ SECURITY CRITICAL)
browser_evaluate({
  script: '() => document.title',
  timeout: 5000  // default: 5000ms
})
// Includes: audit logging, dangerous pattern detection, timeout protection

// Close browser instance
browser_close()
```

### 🔎 Web Search (1 tool) ⭐ NEW

```typescript
// Search the web using search engines
browser_web_search({
  query: 'TypeScript best practices',
  count: 10,  // default: 10, max: 20
  engine: 'google'  // 'google' | 'bing' | 'duckduckgo'
})
// Returns: Formatted search results with titles, URLs, and snippets
```

---

## 🎨 Common Patterns

### Pattern 1: Form Filling

```typescript
// 1. Find all interactive elements
const elements = await browser_get_clickable_elements();

// 2. Fill text input
await browser_paste_text({
  selector: '#email',
  text: 'user@example.com'
});

// 3. Select dropdown
await browser_select({
  selector: '#country',
  value: 'US'
});

// 4. Click submit
await click_element({ index: 5 });
```

### Pattern 2: Content Extraction

```typescript
// 1. Navigate to page
await navigate_to({ url: 'https://example.com' });

// 2. Wait for content
await browser_wait_for_element({
  selector: '.content',
  timeout: 10000
});

// 3. Extract as markdown
const markdown = await browser_get_markdown();

// 4. Get all links
const links = await browser_read_links();
```

### Pattern 3: Interactive Element Discovery ⭐ NEW

```typescript
// 1. Get all clickable elements with detailed properties
const result = await browser_get_clickable_elements({ includeHidden: false });
// Returns summary + full element list with:
// - index, tagName, type, text, selector
// - attributes, isVisible, boundingBox

// 2. Hover over element to reveal tooltips/menus
await browser_hover({ index: 0 });

// 3. Click element
await click_element({ index: 0 });

// 4. Select from dropdown if needed
await browser_select({ 
  selector: '#dropdown', 
  value: 'option-text' 
});
```

### Pattern 4: Tab Management

```typescript
// 1. Open new tab
await browser_new_tab({ url: 'https://example.com' });

// 2. Do work in new tab
await browser_paste_text({ selector: '#search', text: 'query' });

// 3. Switch back to original tab
await browser_switch_tab({ index: 0 });

// 4. Close tab when done
await browser_close_tab();
```

### Pattern 5: Web Search and Research ⭐ NEW

```typescript
// 1. Search for information
const results = await browser_web_search({
  query: 'latest AI developments 2024',
  count: 10,
  engine: 'google'
});

// 2. Navigate to first result
await navigate_to({ url: firstResultUrl });

// 3. Extract content
const markdown = await browser_get_markdown();

// 4. Get related links
const links = await browser_read_links();
```

---

## ⚠️ Security Best Practices

### browser_evaluate Usage

```typescript
// ✅ GOOD: Simple, safe operations
await browser_evaluate({
  script: '() => document.title'
});

await browser_evaluate({
  script: '() => window.location.href'
});

// ⚠️ CAUTION: DOM manipulation
await browser_evaluate({
  script: '() => { document.body.style.backgroundColor = "blue"; }'
});

// ❌ AVOID: Dangerous patterns
// - eval()
// - Function()
// - setTimeout/setInterval
// - document.write
// - innerHTML manipulation
// - Cookie/storage access
// - Network requests
```

### Security Checklist

- ✅ Always use timeout parameter
- ✅ Review audit logs regularly
- ✅ Validate script content before execution
- ✅ Use built-in tools when possible
- ✅ Monitor for security warnings
- ❌ Never execute untrusted user input
- ❌ Avoid dangerous patterns
- ❌ Don't bypass security warnings

---

## 🐛 Troubleshooting

### Element Not Found

```typescript
// Problem: Element not found
await browser_hover({ selector: '#button' });

// Solution 1: Wait for element first
await browser_wait_for_element({ selector: '#button' });
await browser_hover({ selector: '#button' });

// Solution 2: Use index instead
const elements = await browser_get_clickable_elements();
await browser_hover({ index: 0 });
```

### Timeout Issues

```typescript
// Problem: Operation times out
await browser_wait_for_element({ selector: '.slow-loading' });

// Solution: Increase timeout
await browser_wait_for_element({
  selector: '.slow-loading',
  timeout: 60000  // 60 seconds
});
```

### Selection Not Working

```typescript
// Problem: Dropdown not selecting
await browser_select({ selector: '#dropdown', value: 'option1' });

// Solution 1: Try by text
await browser_select({ selector: '#dropdown', value: 'Option 1' });

// Solution 2: Try by index
await browser_select({ selector: '#dropdown', value: '0' });
```

---

## 📊 Performance Tips

### 1. Cache Element Discovery

```typescript
// ❌ BAD: Repeated calls
await browser_get_clickable_elements();
await browser_hover({ index: 0 });
await browser_get_clickable_elements();  // Redundant!
await click_element({ index: 1 });

// ✅ GOOD: Cache results
const elements = await browser_get_clickable_elements();
await browser_hover({ index: 0 });
await click_element({ index: 1 });
```

### 2. Use Selectors When Possible

```typescript
// ❌ SLOWER: Find all elements first
const elements = await browser_get_clickable_elements();
await browser_hover({ index: 5 });

// ✅ FASTER: Use selector directly
await browser_hover({ selector: '#specific-button' });
```

### 3. Batch Operations

```typescript
// ❌ SLOW: Multiple separate calls
await browser_paste_text({ selector: '#field1', text: 'value1' });
await browser_paste_text({ selector: '#field2', text: 'value2' });
await browser_paste_text({ selector: '#field3', text: 'value3' });

// ✅ FASTER: Use evaluate for batch operations
await browser_evaluate({
  script: `() => {
    document.querySelector('#field1').value = 'value1';
    document.querySelector('#field2').value = 'value2';
    document.querySelector('#field3').value = 'value3';
  }`
});
```

---

## 🔗 Related Documentation

- **COMPLETE_BROWSER_TOOLS_IMPLEMENTATION.md** - Full implementation details
- **BROWSER_TOOLS_COMPARISON.md** - Coverage analysis
- **docs/eko-docs/agents/browser-agent.md** - BrowserAgent documentation
- **docs/eko-docs/MCP/browser/README.md** - MCP browser reference

---

## 📞 Support

### Common Issues

1. **Build fails**: Run `pnpm run build:deps`
2. **Tools not found**: Check eko-service.ts registration
3. **Import errors**: Verify imports from `@jarvis-agent/core/types`
4. **Runtime errors**: Check browser console and logs

### Verification

```bash
# Run verification script
./test-browser-tools.sh

# Check build
pnpm run build:deps

# Start app
pnpm run dev
```

---

**Last Updated**: 2025-11-08
**Version**: 2.1.0
**Status**: ✅ Production Ready
**New in 2.1.0**: Web search tool (browser_web_search)
