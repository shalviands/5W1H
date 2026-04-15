import React from 'react';
import { Orbit, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAntigravity } from '../context/AntigravityContext';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { reset } = useAntigravity();

  return (
    <nav className="frosted-nav px-6 py-4 flex justify-between items-center bg-space-900/60 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
      <div 
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => {
          reset();
          navigate('/');
        }}
      >
        <div className="bg-accent-neon/20 p-2 rounded-lg border border-accent-neon/30 text-accent-glow transition-all group-hover:shadow-accent-glow">
          <Orbit className="w-6 h-6 animate-pulse" />
        </div>
        <div>
           <span className="text-xl font-black tracking-tighter text-white uppercase block leading-none">
             5W1H Analysis for Mindmapping
           </span>
           <p className="text-[10px] font-black text-slate-500 tracking-[0.4em] uppercase italic opacity-50">
             Discovery & Synthesis Module
           </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-white block leading-none">{user.name}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{user.role}</span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-accent-glow/20 bg-white/5 flex items-center justify-center text-accent-glow font-black text-sm shadow-neon-glow">
              {user.name.charAt(0)}
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-500 hover:text-accent-danger transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
