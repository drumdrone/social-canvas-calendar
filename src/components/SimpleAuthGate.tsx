import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { isVerified as readIsVerified, setLoggedInUser } from '@/lib/authStorage';

const SimpleAuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVerified, setIsVerified] = useState<boolean>(readIsVerified);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Each user's password is verified server-side by the Convex
  // `auth:verifyPassword` action against their own user_profiles row — it
  // both unlocks the app and identifies who's logged in for comments.
  const verifyPassword = useAction(api.auth.verifyPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await verifyPassword({ password });
      if (result.ok) {
        setLoggedInUser(result.userId);
        setIsVerified(true);
      } else {
        setError('Nesprávné heslo');
      }
    } catch (err) {
      console.error('Convex password check failed:', err);
      setError('Nepodařilo se ověřit heslo. Zkuste to znovu.');
    } finally {
      setSubmitting(false);
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
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Ověřuji…' : 'Vstoupit'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleAuthGate;
