/**
 * Type definitions for Advanced Browser Tools
 * 
 * This module contains all TypeScript interfaces and types used across
 * the advanced browser tools implementation.
 */

// ============================================================================
// Element Extraction Types
// ============================================================================

export interface ElementStyles {
  computed_styles?: Record<string, string>;
  css_rules?: CSSRule[];
  pseudo_elements?: Record<string, Record<string, string>>;
  inheritance_chain?: InheritanceNode[];
}

export interface CSSRule {
  selector: string;
  properties: Record<string, string>;
  source: string;
  specificity: number;
}

export interface InheritanceNode {
  element: string;
  inherited_properties: string[];
}

export interface ElementStructure {
  tag_name: string;
  id?: string;
  classes: string[];
  attributes: Record<string, string>;
  data_attributes: Record<string, string>;
  position: BoundingBox;
  children?: ElementStructure[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ElementEvents {
  inline_handlers: Record<string, string>;
  event_listeners: EventListener[];
  framework_handlers: FrameworkHandler[];
}

export interface EventListener {
  type: string;
  handler: string;
  capture: boolean;
  passive: boolean;
  once: boolean;
}

export interface FrameworkHandler {
  framework: 'react' | 'vue' | 'angular' | 'svelte' | 'other';
  event_type: string;
  handler_name?: string;
}

export interface ElementAnimations {
  css_animations: CSSAnimation[];
  transitions: CSSTransition[];
  transforms: CSSTransform[];
  keyframes: Keyframe[];
}

export interface CSSAnimation {
  name: string;
  duration: string;
  timing_function: string;
  delay: string;
  iteration_count: string;
  direction: string;
  fill_mode: string;
}

export interface CSSTransition {
  property: string;
  duration: string;
  timing_function: string;
  delay: string;
}

export interface CSSTransform {
  type: 'translate' | 'rotate' | 'scale' | 'skew' | 'matrix';
  values: number[];
}

export interface Keyframe {
  name: string;
  rules: KeyframeRule[];
}

export interface KeyframeRule {
  offset: string;
  properties: Record<string, string>;
}

export interface ElementAssets {
  images: ImageAsset[];
  background_images: string[];
  fonts: FontInfo[];
}

export interface ImageAsset {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  is_data_url: boolean;
}

export interface FontInfo {
  family: string;
  weight: string;
  style: string;
  url?: string;
}

export interface RelatedFiles {
  stylesheets: Stylesheet[];
  scripts: Script[];
  imports: string[];
  frameworks: string[];
}

export interface Stylesheet {
  href: string;
  media?: string;
  disabled: boolean;
}

export interface Script {
  src?: string;
  type?: string;
  async: boolean;
  defer: boolean;
  is_module: boolean;
}

export interface CompleteElementClone {
  selector: string;
  url: string;
  timestamp: string;
  styles: ElementStyles;
  structure: ElementStructure;
  events: ElementEvents;
  animations: ElementAnimations;
  assets: ElementAssets;
  related_files: RelatedFiles;
}

// ============================================================================
// JavaScript Function Management Types
// ============================================================================

export interface FunctionInfo {
  name: string;
  parameters: number;
  is_async: boolean;
  source: string;
  signature?: string;
  documentation?: string;
}

export interface ExecutionContext {
  id: string;
  type: 'main' | 'iframe' | 'worker';
  url?: string;
  name?: string;
  is_active: boolean;
}

export interface FunctionExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  stack?: string;
  execution_time_ms?: number;
}

// ============================================================================
// CDP Types
// ============================================================================

export interface CDPCommand {
  domain: string;
  name: string;
  parameters?: CDPParameter[];
  returns?: CDPParameter[];
}

export interface CDPParameter {
  name: string;
  type: string;
  optional?: boolean;
  description?: string;
}

// ============================================================================
// Tool Response Types
// ============================================================================

export interface ToolSuccessResponse<T = any> {
  success: true;
  data: T;
  metadata?: ToolMetadata;
}

export interface ToolErrorResponse {
  success: false;
  error: string;
  error_code: string;
  details?: any;
}

export type ToolResponse<T = any> = ToolSuccessResponse<T> | ToolErrorResponse;

export interface ToolMetadata {
  selector?: string;
  url?: string;
  timestamp?: string;
  execution_time_ms?: number;
  [key: string]: any;
}

// ============================================================================
// File Operation Types
// ============================================================================

export interface FileOperationResult {
  file_path: string;
  file_size_kb: number;
  filename: string;
  timestamp: string;
}

// ============================================================================
// Extraction Options Types
// ============================================================================

export interface StyleExtractionOptions {
  include_computed?: boolean;
  include_css_rules?: boolean;
  include_pseudo?: boolean;
  include_inheritance?: boolean;
}

export interface StructureExtractionOptions {
  include_children?: boolean;
  include_attributes?: boolean;
  include_data_attributes?: boolean;
  max_depth?: number;
}

export interface EventExtractionOptions {
  include_inline?: boolean;
  include_listeners?: boolean;
  include_framework?: boolean;
  analyze_handlers?: boolean;
}

export interface AnimationExtractionOptions {
  include_css_animations?: boolean;
  include_transitions?: boolean;
  include_transforms?: boolean;
  analyze_keyframes?: boolean;
}

export interface AssetExtractionOptions {
  include_images?: boolean;
  include_backgrounds?: boolean;
  include_fonts?: boolean;
  fetch_external?: boolean;
}

export interface RelatedFilesOptions {
  analyze_css?: boolean;
  analyze_js?: boolean;
  follow_imports?: boolean;
  max_depth?: number;
}

export interface CompleteExtractionOptions {
  styles?: StyleExtractionOptions;
  structure?: StructureExtractionOptions;
  events?: EventExtractionOptions;
  animations?: AnimationExtractionOptions;
  assets?: AssetExtractionOptions;
  related_files?: RelatedFilesOptions;
}
