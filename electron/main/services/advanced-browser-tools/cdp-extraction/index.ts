/**
 * CDP Extraction Tools
 * 
 * Tools that use Chrome DevTools Protocol for element extraction.
 * More reliable than JavaScript-based extraction but requires CDP access.
 * Falls back to JS-based extraction if CDP is unavailable.
 */

export { extractElementStylesCdpTool } from './extract-element-styles-cdp';
export { extractCompleteElementCdpTool } from './extract-complete-element-cdp';
