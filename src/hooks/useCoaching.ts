'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { coachingApi, type ChatResponse, type ScoutingReport } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: Array<{
    name: string;
    status: 'pending' | 'complete';
  }>;
}

interface UseCoachingOptions {
  sessionId?: string;
  mapContext?: string;
  teamContext?: string;
}

export function useCoaching(options: UseCoachingOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState(options.sessionId || '');
  const abortControllerRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev =>
      prev.map(msg => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  const sendMessage = useCallback(async (content: string, stream = true) => {
    // Add user message
    addMessage({ role: 'user', content });

    // Add placeholder for assistant
    const assistantId = addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
    });

    if (stream) {
      // Use SSE streaming
      setIsStreaming(true);
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`${API_BASE_URL}/coaching/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            session_id: sessionId || undefined,
            map_context: options.mapContext,
            team_context: options.teamContext,
            use_tools: true,
          }),
          signal: abortControllerRef.current.signal,
        });

        // Get session ID from header
        const newSessionId = response.headers.get('X-Session-Id');
        if (newSessionId && !sessionId) {
          setSessionId(newSessionId);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        const toolCalls: ChatMessage['toolCalls'] = [];

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'text':
                  fullContent += data.data;
                  updateMessage(assistantId, { content: fullContent });
                  break;

                case 'tool_start':
                  toolCalls.push({ name: data.tool_name, status: 'pending' });
                  updateMessage(assistantId, { toolCalls: [...toolCalls] });
                  break;

                case 'tool_result':
                  const idx = toolCalls.findIndex(t => t.name === data.tool_name && t.status === 'pending');
                  if (idx >= 0) {
                    toolCalls[idx].status = 'complete';
                    updateMessage(assistantId, { toolCalls: [...toolCalls] });
                  }
                  break;

                case 'done':
                  updateMessage(assistantId, { isStreaming: false });
                  break;

                case 'error':
                  updateMessage(assistantId, {
                    content: `Error: ${data.data}`,
                    isStreaming: false,
                  });
                  break;
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          updateMessage(assistantId, {
            content: `Error: ${(error as Error).message}`,
            isStreaming: false,
          });
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    } else {
      // Non-streaming fallback
      try {
        const response = await coachingApi.chat({
          message: content,
          session_id: sessionId || undefined,
          map_context: options.mapContext,
          team_context: options.teamContext,
          use_tools: true,
        });

        setSessionId(response.data.session_id);
        updateMessage(assistantId, {
          content: response.data.response,
          isStreaming: false,
        });
      } catch (error) {
        updateMessage(assistantId, {
          content: `Error: ${(error as Error).message}`,
          isStreaming: false,
        });
      }
    }
  }, [sessionId, options.mapContext, options.teamContext, addMessage, updateMessage]);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    if (sessionId) {
      coachingApi.clearSession(sessionId).catch(() => {});
    }
    setSessionId('');
  }, [sessionId]);

  return {
    messages,
    isStreaming,
    sessionId,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}

/**
 * Hook for fetching scouting reports.
 */
export function useScoutingReport(
  teamName: string,
  mapName?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ['scoutingReport', teamName, mapName],
    queryFn: async () => {
      const response = await coachingApi.getScoutingReport(teamName, mapName);
      return response.data;
    },
    enabled: enabled && !!teamName,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for generating scouting reports.
 */
export function useGenerateScoutingReport() {
  return useMutation({
    mutationFn: async ({
      teamName,
      mapName,
      forceRefresh = false,
    }: {
      teamName: string;
      mapName?: string;
      forceRefresh?: boolean;
    }) => {
      const response = await coachingApi.generateScoutingReport(
        teamName,
        mapName,
        forceRefresh
      );
      return response.data;
    },
  });
}

/**
 * Hook for C9 predictions.
 */
export function useC9Prediction() {
  return useMutation({
    mutationFn: async (params: {
      mapName: string;
      side: string;
      phase?: string;
      roundType?: string;
      gameState?: Record<string, unknown>;
      opponentTeam?: string;
    }) => {
      const response = await coachingApi.predictC9Action(params);
      return response.data;
    },
  });
}

/**
 * Hook for mistake analysis.
 */
export function useMistakeAnalysis() {
  return useMutation({
    mutationFn: async (situation: string) => {
      const response = await coachingApi.analyzeMistake(situation);
      return response.data;
    },
  });
}
