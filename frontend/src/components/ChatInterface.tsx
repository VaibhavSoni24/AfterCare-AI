import React, { useState, useRef } from 'react';
import { Send, Mic, Bot, User, AlertTriangle, Zap } from 'lucide-react';
import { useChat } from '../hooks/useChat';

const QUICK_ACTIONS = [
  'What is Metformin for?',
  'Side effects of Lisinopril?',
  'How to monitor blood sugar?',
  'When should I call the doctor?',
];

/**
 * ChatInterface — full Gemini AI chat UI with typing indicator.
 *
 * Features: real-time typing indicator, quick action chips,
 * urgent message highlighting, and smooth scroll-to-bottom.
 */
const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const { messages, isTyping, error, messagesEndRef, sendMessage, initGreeting } = useChat();
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    initGreeting();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const msg = input;
    setInput('');
    await sendMessage(msg);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px] glass-card overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" aria-hidden />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-teal-400 rounded-full border-2 border-[#0F1729] animate-pulse" aria-label="Online" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">AfterCare AI Assistant</h3>
          <p className="text-xs text-teal-400">Powered by Gemini 1.5 Flash · Always available</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" aria-hidden />
          LIVE
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 animate-slide-up ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === 'ai'
                  ? 'bg-gradient-to-br from-sky-600 to-teal-600'
                  : 'bg-gradient-to-br from-purple-600 to-pink-600'
              }`}
              aria-hidden
            >
              {msg.role === 'ai' ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-sky-600 to-sky-500 text-white rounded-tr-sm'
                  : msg.content.startsWith('⚠️')
                  ? 'bg-rose-900/40 border border-rose-500/40 text-rose-100 rounded-tl-sm'
                  : 'bg-[#1a1f2f] text-slate-200 rounded-tl-sm border border-white/5'
              }`}
              role="article"
              aria-label={`${msg.role === 'ai' ? 'AI' : 'You'}: ${msg.content.slice(0, 60)}`}
            >
              {msg.content.startsWith('⚠️') && (
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" aria-hidden />
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                    Urgent
                  </span>
                </div>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className="text-[10px] mt-1.5 opacity-50">
                {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start gap-3 animate-slide-up" aria-label="AI is typing">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-600 to-teal-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" aria-hidden />
            </div>
            <div className="bg-[#1a1f2f] rounded-2xl rounded-tl-sm px-5 py-4 border border-white/5">
              <div className="flex items-center gap-1.5" aria-hidden>
                <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-rose-400 text-xs" role="alert">{error}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-2 flex gap-2 overflow-x-auto custom-scrollbar-x border-t border-white/5">
        <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden />
        {QUICK_ACTIONS.map((action, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickAction(action)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10 hover:border-sky-500/40 focus-ring"
            aria-label={`Quick action: ${action}`}
          >
            {action}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center gap-3 bg-white/5 rounded-2xl border border-white/10 focus-within:border-sky-500/50 transition-all px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your care plan…"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none focus-ring"
            aria-label="Type your message"
            disabled={isTyping}
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 focus-ring flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 text-white" aria-hidden />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-600 mt-2">
          Not a substitute for professional medical advice · Always consult your doctor
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;
