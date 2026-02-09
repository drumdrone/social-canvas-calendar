import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SIMPLE_AUTH_KEY = 'simple_auth_verified';
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'canvas2026';

const SimpleAuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    return localStorage.getItem(SIMPLE_AUTH_KEY) === 'true';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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
