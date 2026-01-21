import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Mail } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('123456');
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { login, loginWithMagicLink, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast({
          title: 'Success',
          description: 'Logged in successfully!',
        });
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to login. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred during login.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginWithMagicLink(magicLinkEmail);
      if (result.success) {
        setMagicLinkSent(true);
        toast({
          title: 'Odkaz odeslán!',
          description: 'Zkontrolujte svůj email a klikněte na odkaz pro přihlášení.',
        });
      } else {
        toast({
          title: 'Chyba',
          description: result.error || 'Nepodařilo se odeslat odkaz.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Chyba',
        description: 'Došlo k chybě při odesílání odkazu.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Přihlášení</CardTitle>
          <CardDescription>
            Přihlaste se ke svému kalendáři sociálních médií
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="magic-link" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="magic-link">
                <Mail className="w-4 h-4 mr-2" />
                Email odkaz
              </TabsTrigger>
              <TabsTrigger value="password">Heslo</TabsTrigger>
            </TabsList>

            <TabsContent value="magic-link" className="space-y-4">
              {magicLinkSent ? (
                <div className="text-center py-6 space-y-3">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-green-100 p-3">
                      <Mail className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Zkontrolujte svůj email</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Odeslali jsme vám odkaz pro přihlášení na adresu:
                    </p>
                    <p className="font-medium mt-1">{magicLinkEmail}</p>
                    <p className="text-xs text-amber-600 mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                      <strong>Důležité:</strong> Před kliknutím na odkaz v emailu se ujistěte, že je aplikace spuštěná.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setMagicLinkSent(false)}
                    className="mt-4"
                  >
                    Odeslat nový odkaz
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleMagicLinkSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="magic-link-email">Email</Label>
                    <Input
                      id="magic-link-email"
                      type="email"
                      placeholder="vas.email@example.com"
                      value={magicLinkEmail}
                      onChange={(e) => setMagicLinkEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Pošleme vám odkaz pro bezpečné přihlášení
                    </p>
                    {!import.meta.env.VITE_APP_URL && (
                      <p className="text-xs text-amber-600 mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                        <strong>Poznámka:</strong> Ujistěte se, že aplikace běží při kliknutí na odkaz v emailu.
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Odesílání...' : 'Odeslat přihlašovací odkaz'}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="password" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vas.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Heslo</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Zadejte heslo"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Přihlašování...' : 'Přihlásit se'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;