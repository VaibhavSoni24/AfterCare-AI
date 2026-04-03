/**
 * useChat — manages AI chat history state and API calls.
 */
import { useState, useCallback, useRef } from 'react';
import { ChatMessage } from '../types/models';
import { chatService } from '../services/ChatService';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = {
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);
      setError(null);

      try {
        const response = await chatService.sendMessage(content, [
          ...messages,
          userMessage,
        ]);

        const aiMessage: ChatMessage = {
          role: 'ai',
          content: response.reply,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (err: any) {
        setError('Failed to get a response. Please try again.');
        const errorMsg: ChatMessage = {
          role: 'ai',
          content:
            "I'm having trouble connecting right now. Please try again or contact your healthcare team if urgent.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
        setTimeout(scrollToBottom, 100);
      }
    },
    [messages, scrollToBottom]
  );

  const initGreeting = useCallback(async () => {
    if (messages.length > 0) return;
    setIsTyping(true);
    try {
      const { greeting } = await chatService.getGreeting();
      const greetingMsg: ChatMessage = {
        role: 'ai',
        content: greeting,
        timestamp: new Date().toISOString(),
      };
      setMessages([greetingMsg]);
    } catch {
      setMessages([
        {
          role: 'ai',
          content:
            "Hello! 👋 I'm AfterCare AI. I'm here to help you with your recovery. What would you like to know?",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [messages.length]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isTyping,
    error,
    messagesEndRef,
    sendMessage,
    initGreeting,
    clearChat,
  };
}
