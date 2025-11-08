/**
 * Browser Scroll Horizontal Tool
 *
 * Scroll horizontally on the page or within specific elements.
 * Useful for timelines, charts, carousels, and wide content.
 *
 * @phase 5
 * @priority HIGH
 * @complexity LOW
 * @risk LOW
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';

interface BrowserScrollHorizontalArgs {
  direction?: 'left' | 'right';
  amount?: number;
  selector?: string;
  smooth?: boolean;
}

export const browserScrollHorizontalTool: Tool = {
  name: 'browser_scroll_horizontal',
  description: 'Scroll horizontally on page or element. Direction: "left" or "right". Amount in pixels (default: 100). Optionally target specific element with selector.',
  parameters: {
    type: 'object',
    properties: {
      direction: {
        type: 'string',
        enum: ['left', 'right'],
        description: 'Scroll direction: "left" or "right"'
      },
      amount: {
        type: 'number',
        description: 'Number of pixels to scroll horizontally (default: 100)'
      },
      selector: {
        type: 'string',
        description: 'CSS selector for element to scroll (default: window)'
      },
      smooth: {
        type: 'boolean',
        description: 'Use smooth scrolling animation (default: true)'
      }
    },
    required: []
  },
  execute: async (
    args: BrowserScrollHorizontalArgs,
    agentContext: AgentContext
  ): Promise<ToolResult> => {
    try {
      const direction = args.direction || 'right';
      const amount = args.amount || 100;
      const smooth = args.smooth !== false; // default true

      const result = await (agentContext.agent as any).execute_script(
        agentContext,
        agentContext,
        (
          direction: string,
          amount: number,
          selector: string | undefined,
          smooth: boolean
        ) => {
          let scrollTarget: Element | Window = window;
          let targetName = 'page';

          // Find scroll target
          if (selector) {
            const element = document.querySelector(selector);
            if (!element) {
              return {
                success: false,
                message: `Element not found: ${selector}`
              };
            }
            scrollTarget = element;
            targetName = selector;
          }

          // Calculate scroll delta
          const scrollDelta = direction === 'left' ? -amount : amount;

          // Get current scroll position
          const currentScrollLeft = scrollTarget === window
            ? window.scrollX || window.pageXOffset
            : (scrollTarget as Element).scrollLeft;

          const newScrollLeft = currentScrollLeft + scrollDelta;

          // Perform scroll
          try {
            if (scrollTarget === window) {
              window.scrollBy({
                left: scrollDelta,
                behavior: smooth ? 'smooth' : 'auto'
              });
            } else {
              (scrollTarget as Element).scrollBy({
                left: scrollDelta,
                behavior: smooth ? 'smooth' : 'auto'
              });
            }
          } catch (e) {
            // Fallback for older browsers
            if (scrollTarget === window) {
              window.scrollTo(newScrollLeft, window.scrollY || window.pageYOffset);
            } else {
              (scrollTarget as Element).scrollLeft = newScrollLeft;
            }
          }

          // Also dispatch wheel event for better compatibility
          const wheelEvent = new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            view: window,
            deltaX: scrollDelta,
            deltaY: 0,
            deltaMode: 0
          });

          if (scrollTarget === window) {
            document.dispatchEvent(wheelEvent);
          } else {
            (scrollTarget as Element).dispatchEvent(wheelEvent);
          }

          return {
            success: true,
            direction: direction,
            amount: amount,
            scrolledFrom: Math.round(currentScrollLeft),
            scrolledTo: Math.round(newScrollLeft),
            target: targetName,
            message: `Scrolled ${direction} by ${amount}px on ${targetName} (${Math.round(currentScrollLeft)} → ${Math.round(newScrollLeft)})`
          };
        },
        [direction, amount, args.selector, smooth]
      );

      if (!result.success) {
        return {
          content: [{
            type: 'text',
            text: result.message
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: result.message
        }],
        isError: false
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error scrolling horizontally: ${error.message}`
        }],
        isError: true
      };
    }
  }
};
