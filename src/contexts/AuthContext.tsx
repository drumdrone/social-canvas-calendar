import React, { createContext, useContext } from 'react';
import type { Id } from '../../convex/_generated/dataModel';
import { getStoredUserId, clearLoggedInUser } from '@/lib/authStorage';

interface AuthContextType {
  // The user_profiles row identified by the password entered at
  // SimpleAuthGate, or null if somehow unset. There's no session/JWT here —
  // it's just the id SimpleAuthGate wrote to localStorage on login.
  currentUserId: Id<'user_profiles'> | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Thin wrapper around SimpleAuthGate's own localStorage — the app still has a
// single password *gate*, but each password now belongs to one user_profiles
// row, so this context also exposes which user that was.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentUserId = getStoredUserId() as Id<'user_profiles'> | null;

  const logout = () => {
    clearLoggedInUser();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ currentUserId, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
