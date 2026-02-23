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
 * Calls the ensure-app-user edge function to create/confirm the admin user
 * via the Supabase Admin API (bypasses email confirmation requirement).
 */
const ensureUserViaEdgeFunction = async (): Promise<boolean> => {
  try {
    console.log('Supabase auto-login: calling ensure-app-user edge function...');
    const { data, error } = await supabase.functions.invoke('ensure-app-user', {
      body: { email: SUPABASE_EMAIL, password: SUPABASE_PASSWORD },
    });

    if (error) {
      console.error('Supabase auto-login: edge function error -', error.message, error);
      return false;
    }

    if (data?.success) {
      console.log('Supabase auto-login: user ensured via edge function, user_id:', data.user_id);
      return true;
    }

    // Handle case where edge function returns error in data
    if (data?.error) {
      console.error('Supabase auto-login: edge function returned error:', data.error);
      return false;
    }

    console.error('Supabase auto-login: edge function returned unexpected:', JSON.stringify(data));
    return false;
  } catch (err: any) {
    console.error('Supabase auto-login: edge function call failed -', err?.message, err);
    return false;
  }
};

/**
 * Ensures a Supabase Auth session exists. Returns user ID or null.
 * Uses edge function to create/confirm user if email confirmation blocks sign-in.
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

  // Sign-in failed - always try edge function to create/confirm user
  // This handles "Email not confirmed", "Invalid login credentials", and any other auth errors
  console.log('Supabase auto-login: sign-in failed, trying edge function...', signInError?.message);
  const ensured = await ensureUserViaEdgeFunction();

  if (ensured) {
    // Retry sign-in after edge function confirmed the user
    // Add a small delay to allow Supabase to propagate the email confirmation
    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
      email: SUPABASE_EMAIL,
      password: SUPABASE_PASSWORD,
    });

    if (!retryError && retryData.session) {
      console.log('Supabase auto-login: signed in after edge function');
      return retryData.session.user.id;
    }

    console.error('Supabase auto-login: sign-in still failed after edge function -', retryError?.message);

    // Second retry with longer delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: retry2Data, error: retry2Error } = await supabase.auth.signInWithPassword({
      email: SUPABASE_EMAIL,
      password: SUPABASE_PASSWORD,
    });

    if (!retry2Error && retry2Data.session) {
      console.log('Supabase auto-login: signed in on second retry');
      return retry2Data.session.user.id;
    }

    console.error('Supabase auto-login: all retries failed -', retry2Error?.message);
  }

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
