import React, { useEffect, useState } from 'react';
import { supabase } from '../api/client';
import { Network, Tag } from 'lucide-react';

interface LiveMindMapProps {
  sessionId: string;
  problemStatement: string;
}

export default function LiveMindMap({ sessionId, problemStatement }: LiveMindMapProps) {
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    const fetchInsights = async () => {
      const { data } = await supabase
        .from('ag_insights')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (data) setInsights(data);
    };

    fetchInsights();

    const channel = supabase
      .channel(`live-mind-map-${sessionId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ag_insights',
        filter: `session_id=eq.${sessionId}`
      }, () => fetchInsights())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const dimensions = ['WHO', 'WHAT', 'WHEN', 'WHERE', 'WHY', 'HOW'];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Center Node */}
      <div className="bg-accent-glow/10 border border-accent-glow/20 p-3 rounded-xl text-center">
        <div className="text-[8px] font-black text-accent-glow uppercase tracking-widest mb-1">Problem Statement</div>
        <p className="text-xs font-bold text-white italic">"{problemStatement || 'Discovering...'}"</p>
      </div>

      {/* Dimension Branches */}
      <div className="space-y-3">
        {dimensions.map(dim => {
          const dimInsights = insights.filter(i => i.dimension === dim);
          if (dimInsights.length === 0) return null;

          return (
            <div key={dim} className="animate-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-neon" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{dim}</span>
                <span className="text-[8px] font-bold text-slate-600 bg-white/5 px-1.5 rounded-full">{dimInsights.length}</span>
              </div>
              <div className="pl-4 space-y-1 border-l border-white/5 ml-0.5">
                {dimInsights.slice(-3).map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 group">
                    <Tag className="w-2 h-2 mt-1 text-slate-700" />
                    <p className="text-[10px] text-slate-500 line-clamp-1 group-hover:line-clamp-none transition-all cursor-default">
                      {insight.raw_text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {insights.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-20 py-10">
            <Network className="w-8 h-8 mb-2" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-center">Building Mind Map...</p>
          </div>
        )}
      </div>
    </div>
  );
}
