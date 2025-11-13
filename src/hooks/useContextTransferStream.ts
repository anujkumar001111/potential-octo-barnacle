import { useEffect, useState, useCallback } from 'react';
import { ContextTransferMessage } from '@/models/message';

/**
 * Custom hook for handling agent context transfer stream events
 * Captures context transfer events from the Eko stream and converts them to UI messages
 */

export interface ContextTransferEvent {
  type: 'context_transfer';
  fromAgent: string;
  toAgent: string;
  context: Record<string, any>;
  variables: Record<string, any>;
  handoffReason?: string;
  dataSize?: number;
  timestamp: number;
}

export function useContextTransferStream() {
  const [transfers, setTransfers] = useState<ContextTransferMessage[]>([]);
  const [latestTransfer, setLatestTransfer] = useState<ContextTransferMessage | null>(null);

  // Handle incoming context transfer events from stream
  const handleContextTransferEvent = useCallback((event: ContextTransferEvent) => {
    if (event.type === 'context_transfer') {
      const transfer: ContextTransferMessage = {
        id: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'context_transfer',
        taskId: '', // Will be set by caller
        fromAgent: event.fromAgent,
        toAgent: event.toAgent,
        context: event.context,
        variables: event.variables,
        handoffReason: event.handoffReason,
        dataSize: event.dataSize,
        timestamp: new Date(event.timestamp),
      };

      setTransfers((prev) => [...prev, transfer]);
      setLatestTransfer(transfer);
    }
  }, []);

  // Register stream listener on mount
  useEffect(() => {
    // Check if window.api.eko has stream event listener
    if (typeof window !== 'undefined' && (window as any).api?.eko?.onEkoStreamMessage) {
      const streamCallback = (error: any, message: any) => {
        if (!error && message?.type === 'context_transfer') {
          handleContextTransferEvent(message);
        }
      };

      (window as any).api.eko.onEkoStreamMessage(streamCallback);
    }
  }, [handleContextTransferEvent]);

  // Clear transfers (useful for resetting between tasks)
  const clearTransfers = useCallback(() => {
    setTransfers([]);
    setLatestTransfer(null);
  }, []);

  return {
    transfers,
    latestTransfer,
    clearTransfers,
    addTransfer: handleContextTransferEvent,
  };
}

export default useContextTransferStream;
