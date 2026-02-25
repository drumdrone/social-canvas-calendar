import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

const SIMPLE_AUTH_KEY = 'simple_auth_verified';
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'canvas2026';

// Supabase auth account used for database operations
const SUPABASE_EMAIL = 'admin@socialcanvas.app';
const SUPABASE_PASSWORD = 'canvas2026admin';

/**
 * Attempts to sign in with the shared Supabase credentials.
 * Handles account creation if the account doesn't exist yet.
 * Returns { userId, error } for diagnostics.
 */
const attemptSignIn = async (): Promise<{ userId: string | null; error: string | null }> => {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: SUPABASE_EMAIL,
    password: SUPABASE_PASSWORD,
  });

  if (!signInError && signInData.session) {
    return { userId: signInData.session.user.id, error: null };
  }

  // If credentials are invalid, try creating the account
  if (signInError?.message?.includes('Invalid login credentials')) {
    console.log('Supabase auto-login: creating account...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: SUPABASE_EMAIL,
      password: SUPABASE_PASSWORD,
    });

    if (signUpError) {
      console.error('Supabase auto-login: sign up failed -', signUpError.message);
      return { userId: null, error: `SignUp: ${signUpError.message}` };
    }

    if (signUpData.session) {
      return { userId: signUpData.session.user.id, error: null };
    }

    // Try signing in after sign up
    const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
      email: SUPABASE_EMAIL,
      password: SUPABASE_PASSWORD,
    });

    if (!retryError && retryData.session) {
      return { userId: retryData.session.user.id, error: null };
    }

    return { userId: null, error: `SignIn after SignUp: ${retryError?.message}` };
  }

  return { userId: null, error: `SignIn: ${signInError?.message} (${signInError?.name})` };
};

// Stores the last auth error for diagnostics
let _lastAuthError: string | null = null;
export const getLastAuthError = () => _lastAuthError;

/**
 * Ensures a Supabase Auth session exists. Returns user ID or null.
 * Uses local-first approach: trust cached session (autoRefreshToken handles expiry),
 * only sign in if no session exists at all.
 */
export const ensureSupabaseSession = async (): Promise<string | null> => {
  _lastAuthError = null;

  // Step 1: Check local cached session (fast, no network call)
  // With autoRefreshToken: true, the Supabase client handles token refresh
  // automatically during API calls, so we don't need to check expiration.
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
    _lastAuthError = 'No cached session found';
  } catch (e) {
    _lastAuthError = `Session check: ${e}`;
  }

  // Step 2: No session at all - try to sign in
  try {
    const result = await attemptSignIn();
    if (result.userId) {
      _lastAuthError = null;
      console.log('Supabase auto-login: signed in successfully');
      return result.userId;
    }
    _lastAuthError = result.error || 'Sign-in returned no user';
  } catch (e) {
    _lastAuthError = `Sign-in threw: ${e}`;
  }

  // Step 3: Clear everything and retry once
  try {
    try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
    const result = await attemptSignIn();
    if (result.userId) {
      _lastAuthError = null;
      console.log('Supabase auto-login: signed in after clearing stale session');
      return result.userId;
    }
    _lastAuthError = result.error || 'Retry sign-in returned no user';
  } catch (e) {
    _lastAuthError = `Retry threw: ${e}`;
  }

  console.error('Supabase auto-login: all attempts failed. Last error:', _lastAuthError);
  return null;
};

/**
 * Forces a fresh sign-in, clearing any cached session first.
 * Use this when a database operation fails due to auth issues.
 */
export const forceReauthenticate = async (): Promise<string | null> => {
  try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
  return ensureSupabaseSession();
};

const SimpleAuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    return localStorage.getItem(SIMPLE_AUTH_KEY) === 'true';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Ensure Supabase session exists when gate is already verified
  useEffect(() => {
    if (isVerified) {
      ensureSupabaseSession();
    }
  }, [isVerified]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      localStorage.setItem(SIMPLE_AUTH_KEY, 'true');
      setIsVerified(true);
    } else {
      setError('Nesprávné přihlašovací údaje');
    }
  };

  if (isVerified) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Přístup do aplikace</CardTitle>
          <CardDescription>
            Zadejte přihlašovací údaje pro přístup do Social Canvas Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gate-username">Uživatel</Label>
              <Input
                id="gate-username"
                type="text"
                placeholder="Zadejte uživatelské jméno"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gate-password">Heslo</Label>
              <Input
                id="gate-password"
                type="password"
                placeholder="Zadejte heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full">
              Vstoupit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleAuthGate;
