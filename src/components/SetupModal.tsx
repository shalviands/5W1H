import React, { useState } from 'react';
import { X, Rocket, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAntigravity } from '../context/AntigravityContext';

interface SetupModalProps {
  onClose: () => void;
}

const SECTOR_OPTIONS = [
  'Healthcare',
  'Agriculture',
  'Logistics',
  'Education',
  'Fintech',
  'Other'
];

const LANGUAGE_OPTIONS = [
  'English',
  'Hindi',
  'Hinglish',
  'Kinglish',
  'Kannada'
];

export default function SetupModal({ onClose }: SetupModalProps) {
  const navigate = useNavigate();
  const { startSession, isLoading, error, activeSession } = useAntigravity();
  const [formData, setFormData] = useState({
    project_name: '',
    sector: SECTOR_OPTIONS[0],
    sector_custom: '',
    stakeholders: '',
    session_language: LANGUAGE_OPTIONS[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalSector = formData.sector === 'Other' ? formData.sector_custom : formData.sector;
    const stakeholderArray = formData.stakeholders
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (stakeholderArray.length === 0) return;

    await startSession({
      project_name: formData.project_name,
      sector: finalSector,
      stakeholders: stakeholderArray,
      session_language: formData.session_language.toLowerCase()
    });
    // The context updates activeSession, but we should navigate if successful
    onClose();
  };

  // Redirect if session started successfully
  React.useEffect(() => {
    if (activeSession && !isLoading && !error) {
      navigate('/session/' + activeSession.id);
    }
  }, [activeSession, isLoading, error]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-space-900/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="glass-panel w-full max-w-lg relative overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-accent-glow to-accent-neon shadow-neon-glow" />
        
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Rocket className="text-accent-glow animate-pulse" /> Start Discovery
            </h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/20 rounded-xl text-xs text-accent-danger font-bold italic animate-in fade-in slide-in-from-top-2">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Project Name</label>
              <input 
                autoFocus
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent-glow outline-none transition-all placeholder:text-slate-700"
                placeholder="e.g. Project GreenTrack"
                value={formData.project_name}
                onChange={e => setFormData({...formData, project_name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Sector</label>
                <select 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-accent-glow cursor-pointer"
                  value={formData.sector}
                  onChange={e => setFormData({...formData, sector: e.target.value})}
                >
                  {SECTOR_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Interview Language</label>
                <select 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-accent-glow cursor-pointer"
                  value={formData.session_language}
                  onChange={e => setFormData({...formData, session_language: e.target.value})}
                >
                  {LANGUAGE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.sector === 'Other' && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Specify Sector</label>
                <input 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent-glow outline-none transition-all placeholder:text-slate-700"
                  placeholder="e.g. Space Exploration"
                  value={formData.sector_custom}
                  onChange={e => setFormData({...formData, sector_custom: e.target.value})}
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Stakeholders (Comma Separated)</label>
              <textarea 
                required
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent-glow outline-none transition-all placeholder:text-slate-700 resize-none"
                placeholder="Farmer, Driver, Vendor, Patient..."
                value={formData.stakeholders}
                onChange={e => setFormData({...formData, stakeholders: e.target.value})}
              />
              <p className="text-[10px] text-slate-600 mt-2 italic font-bold">List the people involved in or affected by this problem.</p>
            </div>

            <button 
              type="submit"
              disabled={isLoading || !formData.project_name || !formData.stakeholders}
              className="w-full bg-gradient-to-r from-accent-glow to-accent-neon text-space-900 font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-neon-glow mt-4 hover:opacity-90 disabled:opacity-30 disabled:shadow-none uppercase tracking-widest text-sm"
            >
              {isLoading ? 'Firing Thrusters...' : 'Initialize Session'} <ChevronRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
