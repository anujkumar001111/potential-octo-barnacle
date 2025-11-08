/**
 * Browser Pinch Zoom Tool
 *
 * Simulates pinch-to-zoom gesture on elements (canvas, maps, images).
 * Useful for zooming in/out on interactive content like TradingView charts.
 *
 * @phase 5
 * @priority HIGH
 * @complexity MEDIUM
 * @risk LOW
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';

interface BrowserPinchZoomArgs {
  selector?: string;
  x?: number;
  y?: number;
  scale?: number;
  direction?: 'in' | 'out';
  steps?: number;
}

export const browserPinchZoomTool: Tool = {
  name: 'browser_pinch_zoom',
  description: 'Simulate pinch-to-zoom gesture on an element or coordinates. Use for canvas, maps, charts. Direction: "in" to zoom in (default scale 1.5), "out" to zoom out (scale 0.5), or specify custom scale.',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector for the element to pinch zoom on'
      },
      x: {
        type: 'number',
        description: 'X coordinate to pinch at (if not using selector)'
      },
      y: {
        type: 'number',
        description: 'Y coordinate to pinch at (if not using selector)'
      },
      scale: {
        type: 'number',
        description: 'Scale factor (> 1.0 to zoom in, < 1.0 to zoom out)'
      },
      direction: {
        type: 'string',
        enum: ['in', 'out'],
        description: 'Zoom direction: "in" (scale 1.5) or "out" (scale 0.5)'
      },
      steps: {
        type: 'number',
        description: 'Number of steps for animation (default: 10)'
      }
    },
    required: []
  },
  execute: async (
    args: BrowserPinchZoomArgs,
    agentContext: AgentContext
  ): Promise<ToolResult> => {
    try {
      let scale = args.scale || 1.0;

      // Apply direction if specified
      if (args.direction === 'in') {
        scale = args.scale || 1.5;
      } else if (args.direction === 'out') {
        scale = args.scale || 0.5;
      }

      const steps = args.steps || 10;

      const result = await (agentContext.agent as any).execute_script(
        agentContext,
        agentContext,
        (
          selector: string | undefined,
          x: number | undefined,
          y: number | undefined,
          targetScale: number,
          steps: number
        ) => {
          // Get target coordinates
          let centerX: number;
          let centerY: number;
          let targetElement: Element | null = null;

          if (selector) {
            targetElement = document.querySelector(selector);
            if (!targetElement) {
              return {
                success: false,
                message: `Element not found: ${selector}`
              };
            }

            const rect = targetElement.getBoundingClientRect();
            centerX = rect.left + rect.width / 2;
            centerY = rect.top + rect.height / 2;
          } else if (x !== undefined && y !== undefined) {
            centerX = x;
            centerY = y;
            targetElement = document.elementFromPoint(x, y);
          } else {
            return {
              success: false,
              message: 'Must provide selector or coordinates (x, y)'
            };
          }

          if (!targetElement) {
            return {
              success: false,
              message: 'No element found at specified location'
            };
          }

          // Calculate finger positions for pinch gesture
          const initialDistance = 100; // pixels apart
          const finalDistance = initialDistance * targetScale;

          // Simulate pinch gesture with wheel events (more compatible)
          // Many libraries like Leaflet, Google Maps listen to wheel with ctrlKey for pinch
          const wheelEvent = new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: centerX,
            clientY: centerY,
            deltaY: targetScale > 1 ? -100 : 100, // negative for zoom in, positive for zoom out
            deltaMode: 0,
            ctrlKey: true // Ctrl+wheel simulates pinch on many platforms
          });

          targetElement.dispatchEvent(wheelEvent);

          // Also dispatch gesturestart/gesturechange/gestureend for Safari-like behavior
          try {
            // @ts-ignore - GestureEvent not in standard types
            const gestureStart = new GestureEvent('gesturestart', {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: centerX,
              clientY: centerY,
              scale: 1.0,
              rotation: 0
            });

            // Animate through steps
            for (let i = 1; i <= steps; i++) {
              const currentScale = 1.0 + (targetScale - 1.0) * (i / steps);

              // @ts-ignore
              const gestureChange = new GestureEvent('gesturechange', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: centerX,
                clientY: centerY,
                scale: currentScale,
                rotation: 0
              });

              targetElement.dispatchEvent(gestureChange);
            }

            // @ts-ignore
            const gestureEnd = new GestureEvent('gestureend', {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: centerX,
              clientY: centerY,
              scale: targetScale,
              rotation: 0
            });

            targetElement.dispatchEvent(gestureStart);
            targetElement.dispatchEvent(gestureEnd);
          } catch (e) {
            // GestureEvent not supported, wheel event already dispatched
          }

          // Also try touch events for better compatibility with touch-based libraries
          try {
            const touch1Start = new Touch({
              identifier: 1,
              target: targetElement,
              clientX: centerX - initialDistance / 2,
              clientY: centerY,
              screenX: centerX - initialDistance / 2,
              screenY: centerY,
              pageX: centerX - initialDistance / 2,
              pageY: centerY
            });

            const touch2Start = new Touch({
              identifier: 2,
              target: targetElement,
              clientX: centerX + initialDistance / 2,
              clientY: centerY,
              screenX: centerX + initialDistance / 2,
              screenY: centerY,
              pageX: centerX + initialDistance / 2,
              pageY: centerY
            });

            const touchStartEvent = new TouchEvent('touchstart', {
              bubbles: true,
              cancelable: true,
              view: window,
              touches: [touch1Start, touch2Start] as any,
              targetTouches: [touch1Start, touch2Start] as any,
              changedTouches: [touch1Start, touch2Start] as any
            });

            targetElement.dispatchEvent(touchStartEvent);

            // Animate touch movement
            for (let i = 1; i <= steps; i++) {
              const currentDistance = initialDistance + (finalDistance - initialDistance) * (i / steps);

              const touch1Move = new Touch({
                identifier: 1,
                target: targetElement,
                clientX: centerX - currentDistance / 2,
                clientY: centerY,
                screenX: centerX - currentDistance / 2,
                screenY: centerY,
                pageX: centerX - currentDistance / 2,
                pageY: centerY
              });

              const touch2Move = new Touch({
                identifier: 2,
                target: targetElement,
                clientX: centerX + currentDistance / 2,
                clientY: centerY,
                screenX: centerX + currentDistance / 2,
                screenY: centerY,
                pageX: centerX + currentDistance / 2,
                pageY: centerY
              });

              const touchMoveEvent = new TouchEvent('touchmove', {
                bubbles: true,
                cancelable: true,
                view: window,
                touches: [touch1Move, touch2Move] as any,
                targetTouches: [touch1Move, touch2Move] as any,
                changedTouches: [touch1Move, touch2Move] as any
              });

              targetElement.dispatchEvent(touchMoveEvent);
            }

            const touchEndEvent = new TouchEvent('touchend', {
              bubbles: true,
              cancelable: true,
              view: window,
              touches: [] as any,
              targetTouches: [] as any,
              changedTouches: [touch1Start, touch2Start] as any
            });

            targetElement.dispatchEvent(touchEndEvent);
          } catch (e) {
            // Touch events failed, already tried wheel
          }

          return {
            success: true,
            x: Math.round(centerX),
            y: Math.round(centerY),
            scale: targetScale,
            direction: targetScale > 1 ? 'in' : 'out',
            message: `Pinch zoom ${targetScale > 1 ? 'in' : 'out'} (scale: ${targetScale.toFixed(2)}) at (${Math.round(centerX)}, ${Math.round(centerY)})`
          };
        },
        [args.selector, args.x, args.y, scale, steps]
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
          text: `Error performing pinch zoom: ${error.message}`
        }],
        isError: true
      };
    }
  }
};
