import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/client';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Check current session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        handleSession(session);
      } else {
        handleAnonymous();
      }
      setIsLoading(false);
    };

    getInitialSession();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        handleSession(session);
      } else {
        handleAnonymous();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAnonymous = () => {
    let guestId = localStorage.getItem('ag_guest_id');
    if (!guestId) {
      guestId = crypto.randomUUID();
      localStorage.setItem('ag_guest_id', guestId);
    }
    setUser({
      id: guestId,
      name: 'Guest User',
      role: 'founder'
    });
    setIsGuest(true);
  };

  const handleSession = (session: any) => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Member',
        role: (session.user.user_metadata?.role as UserRole) || 'founder'
      });
      setIsGuest(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('ag_guest_id');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, isGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
