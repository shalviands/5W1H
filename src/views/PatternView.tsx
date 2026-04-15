import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Zap, AlertTriangle, ChevronRight, ArrowLeft } from 'lucide-react';
import { useAntigravity } from '../context/AntigravityContext';
import { supabase } from '../api/client';
import type { Cluster } from '../types';

const PatternView: React.FC = () => {
  const navigate = useNavigate();
  const { activeSession, reset } = useAntigravity();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeSession) return;
    
    const fetchPatterns = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('ag_clusters')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('evidence_count', { ascending: false });
      
      if (data) setClusters(data as Cluster[]);
      setIsLoading(false);
    };

    fetchPatterns();
  }, [activeSession]);

  const dimensions = ['WHO', 'WHAT', 'WHY', 'WHEN', 'WHERE', 'HOW'];
  const coveredDimensions = clusters.map(c => c.primary_dimension);

  const handleReanalyse = async () => {
    if (!activeSession) return;
    setIsLoading(true);
    // @ts-ignore
    await discoveryApi.invokeClustering(activeSession.id);
    window.location.reload(); 
  };

  if (!activeSession) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in zoom-in-95 duration-700">
      <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-8">
        <button 
           onClick={() => {
             reset();
             navigate('/');
           }}
           className="text-slate-500 hover:text-white flex items-center gap-2 transition-all font-bold text-xs uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
        <button 
           onClick={() => navigate('/patterns')}
           className="bg-white/5 border border-white/10 hover:bg-white/20 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-accent-glow"
        >
          Analyse Patterns
        </button>
      </div>

      <div className="flex justify-between items-center mb-12 border-b border-white/5 pb-8">
        <div>
           <h2 className="text-3xl font-black text-white flex items-center gap-3">
             <Zap className="text-accent-glow" /> Analysis & Patterns
           </h2>
           <p className="text-slate-500 text-sm mt-2">Correlating insights across {activeSession.stakeholders?.length} stakeholders.</p>
        </div>
        <button 
           className="bg-white/5 border border-white/10 hover:bg-white/10 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-slate-300 flex items-center gap-2"
           onClick={handleReanalyse}
           disabled={isLoading}
        >
          {isLoading ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Zap className="w-3 h-3" />}
          {isLoading ? 'Analysing...' : 'Re-analyse'}
        </button>
      </div>

      <div className="space-y-8">
        {/* Cluster Cards */}
        {clusters.map((cluster) => (
          <div key={cluster.id} className={`glass-panel p-6 border-l-4 ${cluster.signal === 'HIGH' ? 'border-accent-danger' : 'border-accent-glow'}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded italic ${cluster.signal === 'HIGH' ? 'bg-accent-danger text-white' : 'bg-accent-glow/20 text-accent-glow'}`}>
                    {cluster.signal}
                  </span>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">{cluster.theme}</h3>
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                   Dimension: {cluster.primary_dimension} · {cluster.evidence_count} supporting insights
                </p>
              </div>
              <div className="bg-white/5 p-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                 <Share2 className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>
        ))}

        {clusters.length === 0 && !isLoading && (
          <div className="glass-panel p-12 text-center border-dashed border-white/5 opacity-40">
             <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-slate-600" />
             <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No patterns detected yet</p>
             <p className="text-xs text-slate-600 mt-2">Keep interviewing stakeholders to find convergences.</p>
          </div>
        )}

        {/* Dimensional Coverage */}
        <div className="glass-panel p-8 bg-white/2">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-4">Dimensional Coverage</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {dimensions.map((dim) => {
              const covered = coveredDimensions.includes(dim as any);
              return (
                <div key={dim}>
                  <div className="flex justify-between text-[10px] font-black mb-3 italic">
                    <span className="text-white tracking-widest">{dim}</span>
                    <span className={covered ? 'text-accent-glow' : 'text-slate-700'}>
                      {covered ? '✦ COVERED' : 'PENDING'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                       className={`h-full transition-all duration-1000 ${covered ? 'bg-accent-glow shadow-neon-glow' : 'bg-white/5'}`} 
                       style={{ width: covered ? '100%' : '5%' }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-16 flex justify-between items-center border-t border-white/5 pt-8">
         <button 
           onClick={() => navigate('/session/' + activeSession.id)}
           className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 hover:text-white transition-all"
         >
           ← Continue Discovery
         </button>
         <button 
           onClick={() => navigate('/mindmap')}
           className="bg-gradient-to-r from-accent-neon to-accent-glow hover:opacity-90 px-8 py-4 rounded-xl font-black text-white shadow-accent-glow flex items-center gap-3 transition-all uppercase tracking-widest text-xs"
         >
           Synthesize Mind Map <ChevronRight className="w-5 h-5" />
         </button>
      </div>
    </div>
  );
};

export default PatternView;
