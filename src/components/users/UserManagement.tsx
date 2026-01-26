import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/comments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ email: '', full_name: '' });
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();

    if (!newUser.email || !newUser.full_name) {
      toast({
        title: 'Chyba',
        description: 'Vyplňte email a celé jméno',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          email: newUser.email,
          full_name: newUser.full_name,
          notification_enabled: true,
        });

      if (error) throw error;

      toast({
        title: 'Úspěch',
        description: 'Uživatel byl přidán',
      });

      setNewUser({ email: '', full_name: '' });
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Opravdu chcete smazat tohoto uživatele?')) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Úspěch',
        description: 'Uživatel byl smazán',
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  async function toggleNotifications(userId: string, currentState: boolean) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ notification_enabled: !currentState })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Úspěch',
        description: 'Nastavení notifikací bylo změněno',
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return <div className="p-4">Načítání...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Správa uživatelů</h2>

        {/* Add new user form */}
        <form onSubmit={handleAddUser} className="space-y-4 mb-8 p-4 border rounded-lg">
          <h3 className="font-semibold">Přidat nového uživatele</h3>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="uzivatel@example.com"
            />
          </div>

          <div>
            <Label htmlFor="full_name">Celé jméno</Label>
            <Input
              id="full_name"
              type="text"
              value={newUser.full_name}
              onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              placeholder="Jan Novák"
            />
          </div>

          <Button type="submit" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Přidat uživatele
          </Button>
        </form>

        {/* Users list */}
        <div className="space-y-2">
          <h3 className="font-semibold mb-4">Uživatelé ({users.length})</h3>

          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="font-medium">{user.full_name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={user.notification_enabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleNotifications(user.id, user.notification_enabled)}
                  title={user.notification_enabled ? 'Notifikace zapnuty' : 'Notifikace vypnuty'}
                >
                  <Mail className="h-4 w-4" />
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteUser(user.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Žádní uživatelé. Přidejte prvního uživatele výše.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
