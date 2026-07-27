import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, convex } from '@/lib/convex';

const SIMPLE_AUTH_KEY = 'simple_auth_verified';

/** Clears the shared-password gate and reloads the app. */
export const logoutApp = () => {
  localStorage.removeItem(SIMPLE_AUTH_KEY);
  window.location.reload();
};

const SimpleAuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    return localStorage.getItem(SIMPLE_AUTH_KEY) === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setChecking(true);

    try {
      // The password itself lives in the Convex env var APP_PASSWORD.
      const result = await convex.action(api.auth.verifyPassword, { password });

      if (result.ok) {
        localStorage.setItem(SIMPLE_AUTH_KEY, 'true');
        setIsVerified(true);
      } else {
        setError('Nesprávné heslo');
      }
    } catch (err) {
      console.error('Password check failed:', err);
      setError('Nepodařilo se spojit se serverem. Zkuste to znovu.');
    } finally {
      setChecking(false);
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
            Zadejte heslo pro přístup do Social Canvas Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gate-password">Heslo</Label>
              <Input
                id="gate-password"
                type="password"
                placeholder="Zadejte heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={checking}>
              {checking ? 'Ověřuji…' : 'Vstoupit'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleAuthGate;
