/**
 * ✅ SECURITY FIX: Shared IPC Contract Types with Zod Validation
 *
 * This file defines type-safe schemas for all IPC messages between
 * renderer and main processes. All IPC handlers MUST validate input
 * using these schemas to prevent injection attacks and data corruption.
 *
 * @module ipc-contracts
 */

import { z } from 'zod';

// ========================================
// Eko Service Schemas
// ========================================

export const EkoRunSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(10_000, 'Message exceeds 10KB limit') // Prevent DoS
});

export const EkoModifySchema = z.object({
  taskId: z.string()
    .min(1, 'Task ID is required')
    .regex(/^(temp-)?[a-f0-9-]+$/, 'Invalid task ID format'),
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(10_000, 'Message exceeds 10KB limit')
});

export const EkoExecuteSchema = z.object({
  taskId: z.string()
    .min(1, 'Task ID is required')
    .regex(/^(temp-)?[a-f0-9-]+$/, 'Invalid task ID format')
});

export const EkoCancelSchema = z.object({
  taskId: z.string()
    .min(1, 'Task ID is required')
    .regex(/^(temp-)?[a-f0-9-]+$/, 'Invalid task ID format')
});

// ========================================
// Config Service Schemas
// ========================================

const ProviderTypeSchema = z.enum(['deepseek', 'qwen', 'google', 'anthropic', 'openrouter', 'custom']);

export const UserModelConfigsSchema = z.object({
  deepseek: z.object({
    apiKey: z.string().optional(),
    baseURL: z.string().url().optional(),
    model: z.string().optional()
  }).optional(),
  qwen: z.object({
    apiKey: z.string().optional(),
    model: z.string().optional()
  }).optional(),
  google: z.object({
    apiKey: z.string().optional(),
    model: z.string().optional()
  }).optional(),
  anthropic: z.object({
    apiKey: z.string().optional(),
    model: z.string().optional()
  }).optional(),
  openrouter: z.object({
    apiKey: z.string().optional(),
    model: z.string().optional()
  }).optional(),
  custom: z.object({
    apiKey: z.string().optional(),
    baseURL: z.string().url().optional(),
    model: z.string().optional()
  }).optional(),
  selectedProvider: ProviderTypeSchema.optional()
});

export const GetModelConfigSchema = z.object({
  provider: ProviderTypeSchema
});

export const SetSelectedProviderSchema = z.object({
  provider: ProviderTypeSchema
});

export const GetEnvVarSchema = z.object({
  key: z.string()
    .min(1, 'Environment variable key is required')
    .max(100, 'Key name too long')
    .regex(/^[A-Z_][A-Z0-9_]*$/, 'Invalid environment variable name')
});

// ========================================
// Agent Service Schemas
// ========================================

export const AgentConfigSchema = z.object({
  browserAgent: z.object({
    enabled: z.boolean(),
    customPrompt: z.string()
  }),
  fileAgent: z.object({
    enabled: z.boolean(),
    customPrompt: z.string()
  }),
  mcpTools: z.record(
    z.string(),
    z.object({
      enabled: z.boolean(),
      config: z.record(z.unknown()).optional()
    })
  )
});

export const SetMcpToolEnabledSchema = z.object({
  toolName: z.string()
    .min(1, 'Tool name is required')
    .max(100, 'Tool name too long'),
  enabled: z.boolean()
});

// ========================================
// View Service Schemas
// ========================================

export const SetDetailViewVisibleSchema = z.object({
  visible: z.boolean()
});

export const UpdateDetailViewBoundsSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().min(0).max(10000),
  height: z.number().int().min(0).max(10000)
});

export const NavigateToSchema = z.object({
  url: z.string()
    .url('Invalid URL format')
    .max(2048, 'URL too long')
});

export const SendToMainViewExecuteCodeSchema = z.object({
  funcName: z.string()
    .min(1, 'Function name is required')
    .max(100, 'Function name too long')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid function name'),
  args: z.array(z.unknown())
    .max(10, 'Too many arguments')
});

export const CaptureWindowSchema = z.object({
  winNo: z.number().int().min(0),
  scale: z.number().min(0.1).max(2.0).optional().default(1.0)
});

// ========================================
// History Service Schemas
// ========================================

export const ShowHistoryViewSchema = z.object({
  screenshot: z.string()
    .min(1, 'Screenshot data is required')
    .max(10_000_000, 'Screenshot data too large') // 10MB limit
});

export const OpenTaskHistorySchema = z.object({
  taskId: z.string()
    .min(1, 'Task ID is required')
    .regex(/^(temp-)?[a-f0-9-]+$/, 'Invalid task ID format')
});

// ========================================
// Voice Service Schemas
// ========================================

export const SendVoiceTextSchema = z.object({
  text: z.string()
    .min(1, 'Voice text cannot be empty')
    .max(1000, 'Voice text too long')
});

export const SendTTSSubtitleSchema = z.object({
  text: z.string()
    .min(1, 'Subtitle text cannot be empty')
    .max(500, 'Subtitle text too long'),
  isStart: z.boolean()
});

// ========================================
// Type Exports (for TypeScript inference)
// ========================================

export type EkoRunRequest = z.infer<typeof EkoRunSchema>;
export type EkoModifyRequest = z.infer<typeof EkoModifySchema>;
export type EkoExecuteRequest = z.infer<typeof EkoExecuteSchema>;
export type EkoCancelRequest = z.infer<typeof EkoCancelSchema>;

export type UserModelConfigs = z.infer<typeof UserModelConfigsSchema>;
export type GetModelConfigRequest = z.infer<typeof GetModelConfigSchema>;
export type SetSelectedProviderRequest = z.infer<typeof SetSelectedProviderSchema>;
export type GetEnvVarRequest = z.infer<typeof GetEnvVarSchema>;

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type SetMcpToolEnabledRequest = z.infer<typeof SetMcpToolEnabledSchema>;

export type SetDetailViewVisibleRequest = z.infer<typeof SetDetailViewVisibleSchema>;
export type UpdateDetailViewBoundsRequest = z.infer<typeof UpdateDetailViewBoundsSchema>;
export type NavigateToRequest = z.infer<typeof NavigateToSchema>;
export type SendToMainViewExecuteCodeRequest = z.infer<typeof SendToMainViewExecuteCodeSchema>;
export type CaptureWindowRequest = z.infer<typeof CaptureWindowSchema>;

export type ShowHistoryViewRequest = z.infer<typeof ShowHistoryViewSchema>;
export type OpenTaskHistoryRequest = z.infer<typeof OpenTaskHistorySchema>;

export type SendVoiceTextRequest = z.infer<typeof SendVoiceTextSchema>;
export type SendTTSSubtitleRequest = z.infer<typeof SendTTSSubtitleSchema>;
