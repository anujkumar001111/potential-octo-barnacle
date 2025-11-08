/**
 * Browser Keyboard Mouse Combo Tool
 *
 * Perform mouse actions while holding keyboard modifiers (Ctrl, Alt, Shift, Meta/Cmd).
 * Essential for canvas operations, chart interactions, and advanced web app controls.
 *
 * @phase 5
 * @priority HIGH
 * @complexity MEDIUM
 * @risk LOW
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';

interface BrowserKeyboardMouseComboArgs {
  action: 'click' | 'scroll' | 'drag' | 'hover' | 'wheel';
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta' | 'cmd')[];
  selector?: string;
  x?: number;
  y?: number;
  deltaX?: number;
  deltaY?: number;
  button?: 'left' | 'right' | 'middle';
}

export const browserKeyboardMouseComboTool: Tool = {
  name: 'browser_keyboard_mouse_combo',
  description: 'Perform mouse action with keyboard modifiers held. Action: click/scroll/drag/hover/wheel. Modifiers: ctrl, alt, shift, meta (Cmd on Mac). Example: Ctrl+click, Shift+drag, Alt+scroll.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['click', 'scroll', 'drag', 'hover', 'wheel'],
        description: 'Mouse action to perform with keyboard modifiers'
      },
      modifiers: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['ctrl', 'alt', 'shift', 'meta', 'cmd']
        },
        description: 'Keyboard modifiers to hold (ctrl, alt, shift, meta/cmd)'
      },
      selector: {
        type: 'string',
        description: 'CSS selector for target element'
      },
      x: {
        type: 'number',
        description: 'X coordinate (if not using selector)'
      },
      y: {
        type: 'number',
        description: 'Y coordinate (if not using selector)'
      },
      deltaX: {
        type: 'number',
        description: 'Horizontal scroll/drag delta (for scroll/drag actions)'
      },
      deltaY: {
        type: 'number',
        description: 'Vertical scroll/drag delta (for scroll/drag actions)'
      },
      button: {
        type: 'string',
        enum: ['left', 'right', 'middle'],
        description: 'Mouse button to use (default: left)'
      }
    },
    required: ['action']
  },
  execute: async (
    args: BrowserKeyboardMouseComboArgs,
    agentContext: AgentContext
  ): Promise<ToolResult> => {
    try {
      const modifiers = args.modifiers || [];
      const button = args.button || 'left';
      const deltaX = args.deltaX || 0;
      const deltaY = args.deltaY || 0;

      const result = await (agentContext.agent as any).execute_script(
        agentContext,
        agentContext,
        (
          action: string,
          modifiers: string[],
          selector: string | undefined,
          x: number | undefined,
          y: number | undefined,
          deltaX: number,
          deltaY: number,
          button: string
        ) => {
          // Get target coordinates and element
          let targetX: number;
          let targetY: number;
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
            targetX = rect.left + rect.width / 2;
            targetY = rect.top + rect.height / 2;
          } else if (x !== undefined && y !== undefined) {
            targetX = x;
            targetY = y;
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

          // Prepare modifier keys
          const modifierStates = {
            ctrlKey: modifiers.includes('ctrl'),
            altKey: modifiers.includes('alt'),
            shiftKey: modifiers.includes('shift'),
            metaKey: modifiers.includes('meta') || modifiers.includes('cmd')
          };

          // Map button names to button codes
          const buttonMap: Record<string, number> = {
            left: 0,
            middle: 1,
            right: 2
          };
          const buttonCode = buttonMap[button] || 0;

          let resultMessage = '';

          // Perform action based on type
          switch (action) {
            case 'click': {
              const mouseDownEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: targetX,
                clientY: targetY,
                button: buttonCode,
                ...modifierStates
              });

              const mouseUpEvent = new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: targetX,
                clientY: targetY,
                button: buttonCode,
                ...modifierStates
              });

              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: targetX,
                clientY: targetY,
                button: buttonCode,
                ...modifierStates
              });

              targetElement.dispatchEvent(mouseDownEvent);
              targetElement.dispatchEvent(mouseUpEvent);
              targetElement.dispatchEvent(clickEvent);

              resultMessage = `Clicked at (${Math.round(targetX)}, ${Math.round(targetY)})`;
              break;
            }

            case 'hover': {
              const mouseMoveEvent = new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: targetX,
                clientY: targetY,
                ...modifierStates
              });

              const mouseOverEvent = new MouseEvent('mouseover', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: targetX,
                clientY: targetY,
                ...modifierStates
              });

              targetElement.dispatchEvent(mouseMoveEvent);
              targetElement.dispatchEvent(mouseOverEvent);

              resultMessage = `Hovered at (${Math.round(targetX)}, ${Math.round(targetY)})`;
              break;
            }

            case 'scroll':
            case 'wheel': {
              const wheelEvent = new WheelEvent('wheel', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: targetX,
                clientY: targetY,
                deltaX: deltaX,
                deltaY: deltaY,
                deltaMode: 0,
                ...modifierStates
              });

              targetElement.dispatchEvent(wheelEvent);

              resultMessage = `Scrolled at (${Math.round(targetX)}, ${Math.round(targetY)}) by (${deltaX}, ${deltaY})`;
              break;
            }

            case 'drag': {
              const startX = targetX;
              const startY = targetY;
              const endX = targetX + deltaX;
              const endY = targetY + deltaY;

              const mouseDownEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: startX,
                clientY: startY,
                button: buttonCode,
                ...modifierStates
              });

              targetElement.dispatchEvent(mouseDownEvent);

              // Simulate drag motion
              const steps = 10;
              for (let i = 1; i <= steps; i++) {
                const currentX = startX + (deltaX * i / steps);
                const currentY = startY + (deltaY * i / steps);

                const mouseMoveEvent = new MouseEvent('mousemove', {
                  bubbles: true,
                  cancelable: true,
                  view: window,
                  clientX: currentX,
                  clientY: currentY,
                  button: buttonCode,
                  ...modifierStates
                });

                document.dispatchEvent(mouseMoveEvent);
              }

              const mouseUpEvent = new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: endX,
                clientY: endY,
                button: buttonCode,
                ...modifierStates
              });

              document.dispatchEvent(mouseUpEvent);

              resultMessage = `Dragged from (${Math.round(startX)}, ${Math.round(startY)}) to (${Math.round(endX)}, ${Math.round(endY)})`;
              break;
            }

            default:
              return {
                success: false,
                message: `Unknown action: ${action}`
              };
          }

          const modifierText = modifiers.length > 0
            ? modifiers.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join('+') + '+'
            : '';

          return {
            success: true,
            action: action,
            modifiers: modifiers,
            x: Math.round(targetX),
            y: Math.round(targetY),
            message: `${modifierText}${action}: ${resultMessage}`
          };
        },
        [action, modifiers, args.selector, args.x, args.y, deltaX, deltaY, button]
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
          text: `Error performing keyboard+mouse combo: ${error.message}`
        }],
        isError: true
      };
    }
  }
};
