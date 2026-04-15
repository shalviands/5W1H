import React, { useState } from 'react';
import { Plus, Rocket, Layers, Clock, Trash2 } from 'lucide-react';
import SetupModal from '../components/SetupModal';
import DeleteProjectModal from '../components/DeleteProjectModal';
import { useNavigate } from 'react-router-dom';
import { useAntigravity } from '../context/AntigravityContext';
import { useAuth } from '../context/AuthContext';
import { discoveryApi } from '../api/client';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { sessions, selectSession } = useAntigravity();
  const { user, isGuest } = useAuth();

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await discoveryApi.deleteProject(projectToDelete.id, user?.id);
      if (error) throw new Error(error);
      
      // Optimistic refresh (or the session state will update via standard flow)
      window.location.reload(); 
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete project: ' + (err as any).message);
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">5W1H Analysis Dashboard</h1>
          <p className="text-slate-400">
            {isGuest ? 'Welcome! Ready for a new 5W1H exploration?' : `Welcome back, ${user?.name}. Ready for a new 5W1H exploration?`}
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-accent-neon hover:bg-accent-neon/80 px-6 py-3 rounded-xl flex items-center gap-2 font-bold text-white transition-all shadow-accent-glow"
        >
          <Plus className="w-5 h-5" />
          New Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions?.map(session => (
          <div 
            key={session.id}
            className="group relative"
          >
            {/* Delete Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setProjectToDelete({ id: session.project_id, name: session.project_name || 'Untitled Project', status: session.status });
              }}
              className="absolute top-4 right-4 z-10 p-2 bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div 
              onClick={() => {
                selectSession(session);
                navigate('/session/' + session.id);
              }}
              className="glass-panel p-6 h-full flex flex-col justify-between cursor-pointer hover:border-accent-glow/30 transition-all border border-white/5 active:scale-[0.98]"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase ${
                    session.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-slate-500 border-white/10'
                  }`}>
                    {session.status}
                  </span>
                  <Clock className="w-4 h-4 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1 leading-tight">{session.project_name || session.problem_domain}</h3>
                <p className="text-[10px] text-accent-glow font-black uppercase tracking-widest mb-3 opacity-70">{session.sector}</p>
                <p className="text-sm text-slate-400 mb-4 line-clamp-1">{session.stakeholders?.join(' · ')}</p>
                
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i <= (session.insight_count || 0 > 6 ? 6 : session.insight_count || 0) ? 'bg-accent-glow shadow-neon-glow' : 'bg-white/10'}`} />
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-auto">
                <span className="text-xs text-slate-500">{session.insight_count || 0} insights captured</span>
                <button className="text-accent-glow font-bold text-sm flex items-center gap-1">
                  Resume <Rocket className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {(!sessions || sessions.length === 0) && (
          <div className="md:col-span-2 glass-panel p-12 border-dashed border-white/5 flex flex-col items-center justify-center text-center opacity-50 h-[300px]">
             <Layers className="w-8 h-8 text-slate-600 mb-4" />
             <p className="text-lg text-slate-500 font-medium">No discovery sessions found.</p>
             <p className="text-sm text-slate-600 max-w-xs mt-2">Start a new session to begin exploring problems using the 5W1H framework.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <SetupModal 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {projectToDelete && (
        <DeleteProjectModal
          projectName={projectToDelete.name}
          hasActiveSessions={projectToDelete.status === 'active'}
          isDeleting={isDeleting}
          onConfirm={handleDeleteProject}
          onCancel={() => setProjectToDelete(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
