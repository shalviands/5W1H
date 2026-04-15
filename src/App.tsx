import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AntigravityProvider, useAntigravity } from './context/AntigravityContext';
import Navbar from './components/Navbar';
import Dashboard from './views/Dashboard';
import DiscoverySession from './views/DiscoverySession';
import PatternView from './views/PatternView';
import MindMapOutput from './views/MindMapOutput';

const AppContent: React.FC = () => {
  const { activeSession } = useAntigravity();
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const showTabs = activeSession && !isHome;

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {showTabs && (
        <div className="frosted-nav bg-white/5 border-b-0 border-t border-white/5 sticky top-0 z-40 backdrop-blur-md">
          <div className="container mx-auto px-6 flex gap-8">
             <button 
               onClick={() => navigate('/session/' + activeSession.id)}
               className={`py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                 location.pathname.includes('/session/') 
                   ? 'border-accent-glow text-accent-glow' 
                   : 'border-transparent text-slate-500 hover:text-slate-300'
               }`}
             >
               discovery
             </button>
             <button 
               onClick={() => navigate('/patterns')}
               className={`py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                 location.pathname === '/patterns' 
                   ? 'border-accent-glow text-accent-glow' 
                   : 'border-transparent text-slate-500 hover:text-slate-300'
               }`}
             >
               patterns
             </button>
             <button 
               onClick={() => navigate('/mindmap')}
               className={`py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                 location.pathname === '/mindmap' 
                   ? 'border-accent-glow text-accent-glow' 
                   : 'border-transparent text-slate-500 hover:text-slate-300'
               }`}
             >
               mindmap
             </button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/session/:id" element={<DiscoverySession />} />
          <Route path="/patterns" element={<PatternView />} />
          <Route path="/mindmap" element={<MindMapOutput />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AntigravityProvider>
        <AppContent />
      </AntigravityProvider>
    </AuthProvider>
  );
}

export default App;
