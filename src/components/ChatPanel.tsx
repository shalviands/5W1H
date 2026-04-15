import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Check, Circle } from 'lucide-react';
import { useAntigravity } from '../context/AntigravityContext';

interface ChatPanelProps {
  sessionId: string;
  stakeholder: string;
}

export default function ChatPanel({ sessionId, stakeholder: initialStakeholder }: ChatPanelProps) {
  const { 
    messages, 
    sendMessage, 
    isAskingAI, 
    activeSession, 
    submitProblemStatement,
    coveredDimensions 
  } = useAntigravity();
  
  const [input, setInput] = useState('');
  const [selectedStakeholder, setSelectedStakeholder] = useState(initialStakeholder);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isInitialState = !activeSession?.problem_domain || activeSession.problem_domain === 'PENDING';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAskingAI]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isAskingAI) return;

    const text = input;
    setInput('');

    if (isInitialState) {
      await submitProblemStatement(text);
    } else {
      await sendMessage(text, selectedStakeholder);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isInitialState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">What problem are you trying to solve?</h2>
            <p className="text-slate-400 text-sm">Be as specific or as general as you like.</p>
          </div>
          
          <div className="space-y-4">
            <textarea
              ref={textareaRef}
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg text-white placeholder:text-slate-600 focus:border-accent-glow focus:ring-1 focus:ring-accent-glow outline-none transition-all resize-none min-h-[160px] leading-relaxed"
              placeholder="Describe the problem in your own words. Don't worry about structure."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isAskingAI}
              className="w-full py-4 bg-accent-glow text-space-900 font-bold rounded-2xl hover:bg-accent-glow/90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              Start Discovery
              <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dimensions = ['WHO', 'WHAT', 'WHEN', 'WHERE', 'WHY', 'HOW'];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* CHAT AREA */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scroll-smooth"
      >
        {messages.map((msg, i) => (
          <div 
            key={i}
            className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`flex gap-3 max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-white/10 shrink-0 mt-1">
                  A
                </div>
              )}
              
              <div className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                msg.role === 'assistant' 
                  ? 'bg-white/5 text-slate-200 border border-white/5' 
                  : 'bg-indigo-600 text-white font-medium'
              }`}>
                 {msg.content}
              </div>
            </div>
          </div>
        ))}

        {isAskingAI && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="flex gap-3 max-w-[75%]">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-white/10 shrink-0 mt-1">
                A
              </div>
              <div className="bg-white/5 border border-white/5 px-4 py-4 rounded-2xl flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-duration:0.6s]" />
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="flex-none p-6 bg-space-900/50 border-t border-white/5 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto space-y-4">
          <form onSubmit={handleSend} className="relative flex items-end gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 transition-all focus-within:border-accent-glow/50 ring-0 focus-within:ring-1 ring-accent-glow/50">
            <textarea 
              ref={textareaRef}
              rows={1}
              className="flex-1 bg-transparent border-none pl-4 py-3 text-[15px] text-white focus:ring-0 outline-none resize-none max-h-32 placeholder:text-slate-600"
              placeholder="Type your answer..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAskingAI}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isAskingAI}
              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:grayscale shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
              <span className="uppercase tracking-widest opacity-60">Speaking as:</span>
              <select 
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-slate-300 outline-none hover:border-white/20 transition-all cursor-pointer"
                value={selectedStakeholder}
                onChange={(e) => setSelectedStakeholder(e.target.value)}
              >
                {activeSession.stakeholders?.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              {dimensions.map(dim => {
                const isCovered = coveredDimensions.includes(dim);
                // For 'WHAT', it's always true once we've started
                const active = dim === 'WHAT' || isCovered;
                
                return (
                  <div 
                    key={dim}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all sm:px-3 sm:text-[10px] ${
                      active 
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                        : 'bg-white/5 text-slate-600 border border-white/5'
                    }`}
                  >
                    {dim}
                    {active ? <Check className="w-2.5 h-2.5" /> : <Circle className="w-2.5 h-2.5 opacity-20" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
