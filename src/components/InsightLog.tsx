import { useState, useEffect } from 'react';
import { supabase } from '../api/client';
import type { Insight } from '../types';

interface InsightLogProps {
  sessionId: string;
}

export default function InsightLog({ sessionId }: InsightLogProps) {
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    // 1. Initial Load
    const fetchInsights = async () => {
      const { data } = await supabase
        .from('ag_insights')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
      
      if (data) setInsights(data as Insight[]);
    };

    fetchInsights();

    // 2. Real-time Subscription
    const channel = supabase
      .channel(`insights-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ag_insights',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setInsights(prev => [payload.new as Insight, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const getSignalColor = (signal: string) => {
    if (signal === 'HIGH') return 'bg-accent-danger';
    if (signal === 'MEDIUM') return 'bg-accent-warning';
    return 'bg-accent-success';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {insights.map((ins) => (
        <div 
          key={ins.id}
          className="glass-card p-4 animate-in slide-in-from-right-4 duration-500 border border-white/5"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex gap-2">
              <span className="text-[9px] font-black bg-accent-glow text-space-900 px-1.5 py-0.5 rounded italic">
                {ins.dimension}
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                {ins.stakeholder_tag}
              </span>
            </div>
            <div className={`w-1.5 h-1.5 rounded-full ${getSignalColor(ins.signal)} shadow-neon-glow`} />
          </div>
          <p className="text-[12px] text-slate-300 leading-relaxed italic border-l border-accent-glow/20 pl-3">
            "{ins.raw_text}"
          </p>
        </div>
      ))}

      {insights.length === 0 && (
         <div className="h-full flex flex-col items-center justify-center opacity-20 italic text-xs text-center px-4 space-y-4">
           <div className="w-12 h-1 px-4 bg-white/10 rounded-full" />
           <p>Insights will appear here as you discover...</p>
         </div>
      )}
    </div>
  );
}
