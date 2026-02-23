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
 * Ensures a Supabase Auth session exists. Returns user ID or null.
 * Creates account automatically if it doesn't exist.
 */
export const ensureSupabaseSession = async (): Promise<string | null> => {
  // Check existing session first
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  // Try to sign in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: SUPABASE_EMAIL,
    password: SUPABASE_PASSWORD,
  });

  if (!signInError && signInData.session) {
    console.log('Supabase auto-login: signed in successfully');
    return signInData.session.user.id;
  }

  if (signInError && signInError.message.includes('Invalid login credentials')) {
    // Account doesn't exist yet, create it
    console.log('Supabase auto-login: creating account...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: SUPABASE_EMAIL,
      password: SUPABASE_PASSWORD,
    });

    if (signUpError) {
      console.error('Supabase auto-login: sign up failed -', signUpError.message);
      return null;
    }

    // signUp may return a session directly (if email confirmation is disabled)
    if (signUpData.session) {
      console.log('Supabase auto-login: signed up and got session');
      return signUpData.session.user.id;
    }

    // Try signing in after sign up (works if email confirmation is disabled)
    const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
      email: SUPABASE_EMAIL,
      password: SUPABASE_PASSWORD,
    });

    if (!retryError && retryData.session) {
      console.log('Supabase auto-login: signed in after sign up');
      return retryData.session.user.id;
    }

    console.error('Supabase auto-login: could not sign in after sign up -', retryError?.message);
    return null;
  }

  console.error('Supabase auto-login: sign in failed -', signInError?.message);
  return null;
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
