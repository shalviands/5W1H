import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Session, Message } from '../types';
import { supabase, discoveryApi } from '../api/client';
import { useAuth } from './AuthContext';

interface AntigravityContextType {
  activeSession: Session | null;
  sessions: Session[];
  messages: Message[];
  isLoading: boolean;
  isAskingAI: boolean;
  error: string | null;
  coveredDimensions: string[];
  startSession: (data: any) => Promise<void>;
  submitProblemStatement: (text: string) => Promise<void>;
  sendMessage: (text: string, stakeholder: string) => Promise<void>;
  selectSession: (session: Session) => void;
  reset: () => void;
}

const AntigravityContext = createContext<AntigravityContextType | undefined>(undefined);

export const AntigravityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coveredDimensions, setCoveredDimensions] = useState<string[]>([]);

  // 1. Fetch Sessions on Load
  useEffect(() => {
    if (!user) return;
    
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('ag_sessions')
        .select('*')
        .order('last_active_at', { ascending: false });
      
      if (data) setSessions(data);
    };

    fetchSessions();

    // Real-time subscription for session list
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ag_sessions' }, 
        () => fetchSessions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // 2. Load History when active session changes
  useEffect(() => {
    if (activeSession) {
      setMessages(activeSession.conversation_history || []);
    }
  }, [activeSession]);

  const startSession = async (formData: any) => {
    if (!user) {
      setError('You must be logged in to start a session.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('ag_sessions')
        .insert({
          project_name: formData.project_name,
          sector: formData.sector,
          stakeholders: formData.stakeholders,
          session_language: formData.session_language,
          created_by: user.id,
          project_id: formData.project_id || '00000000-0000-0000-0000-000000000000',
          team_id: formData.team_id || '00000000-0000-0000-0000-000000000000',
          status: 'active',
          session_type: formData.stakeholders && formData.stakeholders.length > 1 ? 'team' : 'individual',
          problem_domain: 'PENDING',
          prompt_version: 'v2.1'
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setActiveSession(data);
    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitProblemStatement = async (text: string) => {
    if (!activeSession || !user) return;
    setIsLoading(true);
    setError(null);
    try {
      // 1. Update session with problem domain
      const { error: updateError } = await supabase
        .from('ag_sessions')
        .update({ problem_domain: text })
        .eq('id', activeSession.id);
      
      if (updateError) throw updateError;

      // 2. Refresh active session local state
      setActiveSession({ ...activeSession, problem_domain: text });

      // 3. Send as first message to get AI's first question
      await sendMessage(text, activeSession.stakeholders?.[0] || 'Unknown');
    } catch (err: any) {
      console.error('Failed to submit problem statement:', err);
      setError('Failed to submit problem statement: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const sendMessage = async (text: string, stakeholder: string) => {
    if (!activeSession || !user) return;
    
    setIsAskingAI(true);
    setError(null);

    // Optimistic Update — add user message to UI immediately
    const userMsg: Message = { role: 'user', content: text, name: user.name };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);

    try {
      // Build conversation history for the API (role + content only)
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const problemStatement = activeSession.problem_domain === 'PENDING' 
        ? text 
        : (activeSession.problem_domain || text);

      console.log('[sendMessage] Calling intake-agent with:', {
        session_id: activeSession.id,
        user_message: text,
        stakeholder_tag: stakeholder,
        covered_dimensions: coveredDimensions,
        problem_statement: problemStatement,
        history_length: conversationHistory.length
      });

      const { data, error: fnError } = await discoveryApi.invokeIntakeAgent(
        activeSession.id,
        text,
        stakeholder,
        conversationHistory,
        coveredDimensions,
        problemStatement
      );

      console.log('[sendMessage] intake-agent response:', { data, error: fnError });
      
      if (fnError) {
        console.error('[sendMessage] Edge function error:', fnError);
        throw new Error(typeof fnError === 'string' ? fnError : fnError.message || 'Edge function failed');
      }
      
      if (!data || !data.question) {
        console.error('[sendMessage] No question returned:', data);
        throw new Error('No question returned from intake agent');
      }

      // Update covered dimensions
      if (data.dimension_targeted && !coveredDimensions.includes(data.dimension_targeted)) {
        setCoveredDimensions(prev => [...prev, data.dimension_targeted]);
      }

      // Add AI response to chat
      const aiResponse: Message = { role: 'assistant', content: data.question };
      setMessages(prev => [...prev, aiResponse]);

      // Persist conversation history to Supabase
      const updatedHistory = [
        ...conversationHistory,
        { role: 'user', content: text },
        { role: 'assistant', content: data.question }
      ];

      await supabase
        .from('ag_sessions')
        .update({
          conversation_history: updatedHistory,
          last_active_at: new Date().toISOString()
        })
        .eq('id', activeSession.id);

    } catch (err: any) {
      console.error('[sendMessage] Full error:', err);
      // Show error in chat so user knows something went wrong
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: `Something went wrong: ${err.message || 'Unknown error'}. Please try again.`
      }]);
    } finally {
      setIsAskingAI(false);
    }
  };

  const selectSession = (session: Session) => {
    setActiveSession(session);
    setCoveredDimensions([]);
  };

  const reset = () => {
    setActiveSession(null);
    setMessages([]);
    setCoveredDimensions([]);
  };

  return (
    <AntigravityContext.Provider value={{
      activeSession,
      sessions,
      messages,
      isLoading,
      isAskingAI,
      error,
      coveredDimensions,
      startSession,
      submitProblemStatement,
      sendMessage,
      selectSession,
      reset
    }}>
      {children}
    </AntigravityContext.Provider>
  );
};

export const useAntigravity = () => {
  const context = useContext(AntigravityContext);
  if (!context) throw new Error('useAntigravity must be used within AntigravityProvider');
  return context;
};
