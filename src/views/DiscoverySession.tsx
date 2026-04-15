import { useNavigate } from 'react-router-dom';
import { Orbit, ArrowLeft, Square } from 'lucide-react';
import ChatPanel from '../components/ChatPanel';
import LiveMindMap from '../components/LiveMindMap';
import { useAntigravity } from '../context/AntigravityContext';
import { discoveryApi } from '../api/client';
import { useState } from 'react';

const DiscoverySession: React.FC = () => {
  const navigate = useNavigate();
  const { activeSession, reset } = useAntigravity();
  const [isStopping, setIsStopping] = useState(false);
  const dimensions = ['WHO', 'WHAT', 'WHEN', 'WHERE', 'WHY', 'HOW'];

  if (!activeSession) return null;

  const handleStop = async () => {
    const confirmed = window.confirm("Stop discovery and generate your mind map?");
    if (!confirmed) return;
    
    setIsStopping(true);
    try {
      await discoveryApi.invokeSynthesis(activeSession.id);
      navigate('/patterns'); // Navigate to the patterns/mindmap view
    } catch (err) {
      console.error('Failed to generate mind map:', err);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-space-950 overflow-hidden font-inter select-none">
      
      {/* HEADER: fixed, always visible */}
      <header className="flex-none flex justify-between items-center px-6 py-4 border-b border-white/5 bg-space-900/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              reset();
              navigate('/');
            }} 
            className="p-2 -ml-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-accent-glow/10 flex items-center justify-center border border-accent-glow/20">
                <Orbit className="w-4 h-4 text-accent-glow" />
             </div>
             <div>
                <h1 className="text-sm font-bold text-white leading-tight">
                   {activeSession.project_name || 'Untitled Discovery'}
                </h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                   {activeSession.sector}
                </p>
             </div>
          </div>
        </div>

        <button 
          onClick={handleStop}
          disabled={isStopping}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
        >
          {isStopping ? (
            <div className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          ) : (
            <Square className="w-3 h-3 fill-current" />
          )}
          Stop & Generate Map
        </button>
      </header>

      {/* MAIN CHAT AREA: scrollable */}
      <main className="flex-1 overflow-hidden relative flex flex-col items-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-space-900/40 via-transparent to-transparent">
        <div className="w-full max-w-3xl flex-1 flex flex-col overflow-hidden">
          <ChatPanel 
             sessionId={activeSession.id} 
             stakeholder={activeSession.stakeholders?.[0] || 'Unknown'} 
          />
        </div>
      </main>
    </div>
  );
};

export default DiscoverySession;
