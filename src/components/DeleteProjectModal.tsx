import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteProjectModalProps {
  projectName: string;
  hasActiveSessions: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteProjectModal({ 
  projectName, 
  hasActiveSessions, 
  isDeleting, 
  onConfirm, 
  onCancel 
}: DeleteProjectModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-space-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="bg-red-500/10 p-2 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <button 
              onClick={onCancel}
              disabled={isDeleting}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Delete Project?</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            This will permanently delete <span className="text-white font-bold">"{projectName}"</span> and all its discovery sessions, insights, and clusters. This action cannot be undone.
          </p>

          {hasActiveSessions && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3 mb-6">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-200/80 leading-normal">
                This project has an active discovery session. It will also be deleted immediately.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-slate-300 font-bold text-sm hover:bg-white/10 transition-all border border-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-[1.5] px-4 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Delete Project</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
