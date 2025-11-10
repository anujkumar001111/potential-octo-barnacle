#!/usr/bin/env node

/**
 * Diagnostic script for browser tools implementation
 * Run with: node diagnose-browser-tools.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosing Browser Tools Implementation...\n');

// Check 1: Verify all tool files exist
console.log('✓ Checking tool files...');
const toolFiles = [
  // Phase 1: Content Extraction
  'browser-get-markdown.ts',
  'browser-read-links.ts',
  'browser-go-forward.ts',
  'browser-get-text.ts',
  'browser-press-key.ts',
  'browser-scroll.ts',
  // Phase 2: Tab Management
  'browser-new-tab.ts',
  'browser-close-tab.ts',
  'browser-switch-tab.ts',
  // Phase 3: Core Interaction
  'browser-paste-text.ts',
  'browser-wait-for-element.ts',
  // Phase 4: Advanced Interaction
  'browser-get-clickable-elements.ts',
  'browser-hover.ts',
  'browser-select.ts',
  // Phase 5: Advanced Features
  'browser-get-download-list.ts',
  'browser-evaluate.ts',
  'browser-close.ts',
  // Phase 6: Web Search
  'browser-web-search.ts'
];

const toolsDir = path.join(__dirname, 'electron/main/services/browser-tools');
let missingFiles = [];

toolFiles.forEach(file => {
  const filePath = path.join(toolsDir, file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.error('❌ Missing tool files:', missingFiles);
} else {
  console.log('✅ All 18 tool files exist\n');
}

// Check 2: Verify shared utilities
console.log('✓ Checking shared utilities...');
const sharedFiles = ['dom-utils.ts', 'error-codes.ts', 'types.ts'];
const sharedDir = path.join(toolsDir, 'shared');

let missingShared = [];
sharedFiles.forEach(file => {
  const filePath = path.join(sharedDir, file);
  if (!fs.existsSync(filePath)) {
    missingShared.push(file);
  }
});

if (missingShared.length > 0) {
  console.error('❌ Missing shared files:', missingShared);
} else {
  console.log('✅ All shared utility files exist\n');
}

// Check 3: Verify index.ts exports
console.log('✓ Checking index.ts exports...');
const indexPath = path.join(toolsDir, 'index.ts');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const expectedExports = [
    // Phase 1
    'browserGetMarkdownTool',
    'browserReadLinksTool',
    'browserGoForwardTool',
    'browserGetTextTool',
    'browserPressKeyTool',
    'browserScrollTool',
    // Phase 2
    'browserNewTabTool',
    'browserCloseTabTool',
    'browserSwitchTabTool',
    // Phase 3
    'browserPasteTextTool',
    'browserWaitForElementTool',
    // Phase 4
    'browserGetClickableElementsTool',
    'browserHoverTool',
    'browserSelectTool',
    // Phase 5
    'browserGetDownloadListTool',
    'browserEvaluateTool',
    'browserCloseTool',
    // Phase 6
    'browserWebSearchTool'
  ];

  let missingExports = [];
  expectedExports.forEach(exp => {
    if (!indexContent.includes(exp)) {
      missingExports.push(exp);
    }
  });

  if (missingExports.length > 0) {
    console.error('❌ Missing exports in index.ts:', missingExports);
  } else {
    console.log('✅ All 18 tools exported from index.ts\n');
  }
} else {
  console.error('❌ index.ts not found!');
}

// Check 4: Verify eko-service.ts imports
console.log('✓ Checking eko-service.ts imports...');
const ekoServicePath = path.join(__dirname, 'electron/main/services/eko-service.ts');
if (fs.existsSync(ekoServicePath)) {
  const ekoContent = fs.readFileSync(ekoServicePath, 'utf8');
  
  const hasImport = ekoContent.includes('from "./browser-tools"');
  const hasPhase1 = ekoContent.includes('browserGetMarkdownTool');
  const hasPhase2 = ekoContent.includes('browserNewTabTool');
  const hasPhase3 = ekoContent.includes('browserPasteTextTool');
  const hasPhase4 = ekoContent.includes('browserGetClickableElementsTool');
  const hasPhase5 = ekoContent.includes('browserEvaluateTool');
  
  if (!hasImport) {
    console.error('❌ Missing import from "./browser-tools" in eko-service.ts');
  } else if (!hasPhase1 || !hasPhase2 || !hasPhase3 || !hasPhase4 || !hasPhase5) {
    console.error('❌ Some tool imports missing in eko-service.ts');
    if (!hasPhase4) console.error('   → Missing Phase 4 tools (browser_get_clickable_elements, etc.)');
    if (!hasPhase5) console.error('   → Missing Phase 5 tools (browser_evaluate, etc.)');
  } else {
    console.log('✅ All tools imported in eko-service.ts\n');
  }
} else {
  console.error('❌ eko-service.ts not found!');
}

// Check 5: Verify package.json dependencies
console.log('✓ Checking dependencies...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const hasTurndown = packageJson.dependencies?.turndown;
  const hasTurndownTypes = packageJson.devDependencies?.['@types/turndown'];
  
  if (!hasTurndown) {
    console.error('❌ Missing dependency: turndown');
  } else if (!hasTurndownTypes) {
    console.error('⚠️  Missing dev dependency: @types/turndown');
  } else {
    console.log('✅ All required dependencies installed\n');
  }
}

// Check 6: Check dist folder
console.log('✓ Checking build output...');
const distToolsPath = path.join(__dirname, 'dist/electron/main/services/browser-tools');
if (!fs.existsSync(distToolsPath)) {
  console.error('❌ dist/electron/main/services/browser-tools/ not found');
  console.log('   → Run: pnpm run build:deps to rebuild\n');
} else {
  const distFiles = fs.readdirSync(distToolsPath);
  console.log(`✅ Build output exists (${distFiles.length} files)\n`);
}

console.log('\n📋 Summary:');
console.log('If you see any ❌ errors above, those need to be fixed.');
console.log('\n💡 Common fixes:');
console.log('1. If dist folder is missing: run `pnpm run build:deps`');
console.log('2. If dependencies missing: run `pnpm install`');
console.log('3. If files missing: check git status for uncommitted changes');
console.log('4. If imports wrong: check eko-service.ts import statement');
