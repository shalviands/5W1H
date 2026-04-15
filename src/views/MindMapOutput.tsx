import React, { useState, useEffect } from 'react';
import { FileText, Download, Share, ArrowLeft, GitGraph, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAntigravity } from '../context/AntigravityContext';
import { supabase, discoveryApi } from '../api/client';

const MindMapOutput: React.FC = () => {
  const navigate = useNavigate();
  const { activeSession, reset } = useAntigravity();
  const [mindMap, setMindMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeSession) return;
    
    const fetchMindMap = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('ag_mind_maps')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) setMindMap(data);
      setIsLoading(false);
    };

    fetchMindMap();
  }, [activeSession]);

  const handleSynthesize = async () => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      const { data, error } = await discoveryApi.invokeSynthesis(activeSession.id);
      if (error) throw error;
      setMindMap(data);
    } catch (err) {
      console.error('Synthesis failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeSession) return null;

  return (
    <div className="max-w-6xl mx-auto py-8 animate-in fade-in duration-1000">
      <div className="flex justify-between items-center mb-12">
        <button 
          onClick={() => {
            reset();
            navigate('/');
          }}
          className="text-slate-500 hover:text-white flex items-center gap-2 transition-all font-bold text-xs uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Exit to Project
        </button>
        <div className="flex gap-4">
          <button className="glass-card px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-300 border border-white/5">
            <Share className="w-4 h-4" /> Share Report
          </button>
          <button className="bg-accent-glow text-space-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-neon-glow hover:bg-accent-glow/80 active:scale-95 transition-all">
            <Download className="w-4 h-4" /> Export Document
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Mind Map Tree */}
        <div className="lg:col-span-3 glass-panel p-10 relative overflow-hidden bg-space-800 border border-white/5 h-[600px] flex flex-col">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] select-none"><GitGraph className="w-96 h-96" /></div>
          
          <div className="flex justify-between items-center mb-12 border-b border-white/5 pb-6">
             <h3 className="text-[10px] font-black text-accent-glow uppercase tracking-[0.3em] italic">Synthesized Mind Map</h3>
             <span className="text-[10px] font-bold text-slate-600 uppercase">Version 1.0</span>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-accent-glow/20 border-t-accent-glow rounded-full animate-spin" />
              </div>
            ) : mindMap ? (
              <div className="prose prose-invert max-w-none">
                 <pre className="whitespace-pre-wrap font-sans text-slate-300 leading-relaxed text-sm bg-transparent border-none p-0">
                    {mindMap.mind_map_md}
                 </pre>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                <Sparkles className="w-16 h-16 text-slate-600 animate-pulse" />
                <div className="space-y-2">
                   <p className="font-black text-xs uppercase tracking-widest text-white">No Mind Map Generated</p>
                   <p className="text-xs text-slate-400 max-w-xs mx-auto italic">Dimensions covered: {activeSession.covered_dimensions?.join(', ') || 'None'}</p>
                </div>
                <button 
                  onClick={handleSynthesize}
                  className="bg-white/5 border border-white/10 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all text-white"
                >
                  Generate Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Insight Report */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 border border-white/5">
             <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2 italic">
               <FileText className="w-4 h-4 text-accent-glow" /> Opportunity Gaps
             </h4>
             <div className="space-y-6">
                {(mindMap?.opportunity_gaps && mindMap.opportunity_gaps.length > 0 ? mindMap.opportunity_gaps : ['Analyze data to identify gaps.']).map((gap: any, i: number) => (
                  <div key={i} className="group cursor-default">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="text-accent-neon font-black text-[10px] italic">#{i+1}</span>
                       <div className="h-px flex-1 bg-white/5 group-hover:bg-accent-neon/30 transition-all" />
                    </div>
                    <h5 className="text-sm font-bold text-white mb-2 leading-tight">
                       {typeof gap === 'string' ? gap : gap.description || 'Insight correlation gap detected.'}
                    </h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed italic opacity-70">
                       Signal verified across discovery points.
                    </p>
                  </div>
                ))}
             </div>
          </div>

          <div className="glass-panel p-8 bg-accent-glow/2 border-accent-glow/5 relative overflow-hidden">
             <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent-glow/5 rounded-full blur-3xl" />
             <h4 className="text-[9px] font-black text-accent-glow uppercase tracking-[0.3em] mb-4 italic">Discovery Completion</h4>
             <p className="text-3xl font-black text-white tracking-tighter mb-4 italic">66<span className="text-accent-glow">%</span></p>
             <div className="flex gap-1.5 h-1.5">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className={`flex-1 rounded-full transition-all duration-1000 ${i <= 4 ? 'bg-accent-glow shadow-neon-glow' : 'bg-white/10'}`} />
                ))}
             </div>
             <p className="text-[9px] font-bold text-slate-500 mt-6 uppercase tracking-widest leading-loose">
                Insights captured: {mindMap?.total_insights || activeSession.insight_count || 0}<br/>
                Stakeholders interviewed: {activeSession.stakeholders?.length}
             </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MindMapOutput;
