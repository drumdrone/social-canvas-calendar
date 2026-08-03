import React, { createContext, useContext } from 'react';

const SIMPLE_AUTH_KEY = 'simple_auth_verified';

interface AuthContextType {
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

// Thin wrapper around SimpleAuthGate's own localStorage flag — the app has a
// single shared-password gate, not per-user accounts, so the only thing this
// context needs to expose is a way to clear that flag and show the gate again.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const logout = () => {
    localStorage.removeItem(SIMPLE_AUTH_KEY);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ logout }}>
      {children}
    </AuthContext.Provider>
  );
};
