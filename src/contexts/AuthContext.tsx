import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  sessionExpiresAt: Date | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;

    // Check current auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setUser(session?.user ?? null);
      setSessionExpiresAt(session?.expires_at ? new Date(session.expires_at * 1000) : null);
      setIsLoading(false);
      
      if (session) {
        scheduleRefresh(session.expires_at);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUser(session?.user ?? null);
      setSessionExpiresAt(session?.expires_at ? new Date(session.expires_at * 1000) : null);
      setIsLoading(false);

      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      if (session) {
        scheduleRefresh(session.expires_at);
      }
    });

    const scheduleRefresh = (expiresAt: number) => {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilRefresh = (expiresAt - now - 300) * 1000; // Refresh 5 minutes before expiry
      
      if (timeUntilRefresh > 0) {
        refreshTimer = setTimeout(() => {
          refreshSession();
        }, timeUntilRefresh);
      }
    };

    return () => {
      subscription.unsubscribe();
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // For demo purposes, sign up the user if they don't exist, then sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError && signInError.message.includes('Invalid login credentials')) {
        // Try to sign up the user
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          console.error('Sign up error:', signUpError);
          return false;
        }

        // Now try to sign in again
        const { error: secondSignInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (secondSignInError) {
          console.error('Second sign in error:', secondSignInError);
          return false;
        }
      } else if (signInError) {
        console.error('Sign in error:', signInError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const loginWithMagicLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('Magic link error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Magic link error:', error);
      return { success: false, error: 'Nepodařilo se odeslat odkaz' };
    }
  };

  const logout = async () => {
    // Clean up auth state
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Force page reload for clean state
    window.location.href = '/';
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        return false;
      }
      return !!data.session;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      login,
      loginWithMagicLink,
      logout,
      refreshSession,
      sessionExpiresAt,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};