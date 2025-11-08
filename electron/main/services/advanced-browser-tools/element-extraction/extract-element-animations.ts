/**
 * Extract Element Animations Tool
 * Extracts CSS animations, transitions, transforms, and keyframes
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import {
  SecurityValidator,
  ResponseFormatter,
  AdvancedToolError,
  AdvancedToolErrorCode,
  handleToolError,
  type ElementAnimations,
  type AnimationExtractionOptions
} from '../shared';

interface ExtractAnimationsParams extends AnimationExtractionOptions {
  selector: string;
}

export const extractElementAnimationsTool: Tool = {
  name: 'extract_element_animations',
  description: 'Extract CSS animations, transitions, and transforms from an element. Returns animation properties, keyframes, transition settings, and transform values.',
  parameters: {
    type: 'object',
    properties: {
      selector: { type: 'string', description: 'CSS selector for the element' },
      include_css_animations: { type: 'boolean', default: true },
      include_transitions: { type: 'boolean', default: true },
      include_transforms: { type: 'boolean', default: true },
      analyze_keyframes: { type: 'boolean', default: true }
    },
    required: ['selector']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    const startTime = Date.now();
    
    try {
      const params: ExtractAnimationsParams = {
        selector: String(args.selector || ''),
        include_css_animations: args.include_css_animations !== false,
        include_transitions: args.include_transitions !== false,
        include_transforms: args.include_transforms !== false,
        analyze_keyframes: args.analyze_keyframes !== false
      };

      SecurityValidator.validateSelector(params.selector);

      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (selector: string, options: AnimationExtractionOptions) => {
          const element = document.querySelector(selector);
          if (!element) return { error: 'Element not found', selector };

          const computed = window.getComputedStyle(element);
          const result: any = {};

          // Extract CSS animations
          if (options.include_css_animations) {
            const animName = computed.getPropertyValue('animation-name');
            if (animName && animName !== 'none') {
              result.css_animations = [{
                name: animName,
                duration: computed.getPropertyValue('animation-duration'),
                timing_function: computed.getPropertyValue('animation-timing-function'),
                delay: computed.getPropertyValue('animation-delay'),
                iteration_count: computed.getPropertyValue('animation-iteration-count'),
                direction: computed.getPropertyValue('animation-direction'),
                fill_mode: computed.getPropertyValue('animation-fill-mode')
              }];
            } else {
              result.css_animations = [];
            }
          }

          // Extract transitions
          if (options.include_transitions) {
            const transProperty = computed.getPropertyValue('transition-property');
            if (transProperty && transProperty !== 'none') {
              result.transitions = [{
                property: transProperty,
                duration: computed.getPropertyValue('transition-duration'),
                timing_function: computed.getPropertyValue('transition-timing-function'),
                delay: computed.getPropertyValue('transition-delay')
              }];
            } else {
              result.transitions = [];
            }
          }

          // Extract transforms
          if (options.include_transforms) {
            const transform = computed.getPropertyValue('transform');
            result.transforms = transform && transform !== 'none' 
              ? [{ type: 'matrix', values: transform.match(/[\d.-]+/g)?.map(Number) || [] }]
              : [];
          }

          // Extract keyframes (simplified)
          if (options.analyze_keyframes && result.css_animations?.length > 0) {
            result.keyframes = [];
            try {
              const sheets = Array.from(document.styleSheets);
              for (const sheet of sheets) {
                try {
                  const rules = sheet.cssRules || sheet.rules;
                  if (!rules) continue;
                  
                  for (let i = 0; i < rules.length; i++) {
                    const rule = rules[i];
                    if (rule.type === CSSRule.KEYFRAMES_RULE) {
                      const kfRule = rule as CSSKeyframesRule;
                      if (result.css_animations.some((a: any) => a.name === kfRule.name)) {
                        const keyframeRules: any[] = [];
                        for (let j = 0; j < kfRule.cssRules.length; j++) {
                          const kf = kfRule.cssRules[j] as CSSKeyframeRule;
                          const props: Record<string, string> = {};
                          for (let k = 0; k < kf.style.length; k++) {
                            const prop = kf.style[k];
                            props[prop] = kf.style.getPropertyValue(prop);
                          }
                          keyframeRules.push({ offset: kf.keyText, properties: props });
                        }
                        result.keyframes.push({ name: kfRule.name, rules: keyframeRules });
                      }
                    }
                  }
                } catch (e) {
                  // Skip inaccessible stylesheets
                }
              }
            } catch (e) {
              // Keyframe extraction failed
            }
          }

          return result;
        },
        [params.selector, params]
      );

      if (result && typeof result === 'object' && 'error' in result) {
        throw new AdvancedToolError(
          AdvancedToolErrorCode.ELEMENT_NOT_FOUND,
          result.error as string,
          { selector: params.selector }
        );
      }

      const executionTime = Date.now() - startTime;
      const url = await (agentContext.agent as any).execute_script(agentContext, () => window.location.href, []);
      const metadata = ResponseFormatter.createMetadata(params.selector, url as string, executionTime);
      const response = ResponseFormatter.success<ElementAnimations>(result as ElementAnimations, metadata);

      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
        isError: false
      };
    } catch (error: any) {
      const errorResponse = handleToolError(error);
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResponse, null, 2) }],
        isError: true
      };
    }
  }
};
