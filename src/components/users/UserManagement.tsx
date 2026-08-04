import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Mail, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface UiUser {
  id: Id<'user_profiles'>;
  email: string;
  full_name: string;
  notification_enabled: boolean;
}

export function UserManagement() {
  const raw = useQuery(api.userProfiles.list);
  const loading = raw === undefined;
  const users = useMemo<UiUser[]>(
    () =>
      (raw ?? []).map((u: any) => ({
        id: u._id,
        email: u.email,
        full_name: u.fullName,
        notification_enabled: u.notificationEnabled !== false,
      })),
    [raw],
  );
  const createUser = useMutation(api.userProfiles.create);
  const updateUser = useMutation(api.userProfiles.update);
  const removeUser = useMutation(api.userProfiles.remove);

  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '' });
  // Draft password per user row — only committed on "Uložit heslo", keyed by
  // user id so typing in one row's input can't leak into another's.
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const { toast } = useToast();

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
      await createUser({
        email: newUser.email,
        fullName: newUser.full_name,
        notificationEnabled: true,
        password: newUser.password || undefined,
      });
      toast({ title: 'Úspěch', description: 'Uživatel byl přidán' });
      setNewUser({ email: '', full_name: '', password: '' });
    } catch (error: any) {
      toast({ title: 'Chyba', description: error?.message, variant: 'destructive' });
    }
  }

  async function handleSetPassword(user: UiUser) {
    const password = passwordDrafts[user.id]?.trim();
    if (!password) return;
    try {
      await updateUser({
        id: user.id,
        patch: {
          email: user.email,
          fullName: user.full_name,
          notificationEnabled: user.notification_enabled,
          password,
        },
      });
      setPasswordDrafts((prev) => ({ ...prev, [user.id]: '' }));
      toast({ title: 'Úspěch', description: `Heslo pro ${user.full_name} bylo nastaveno` });
    } catch (error: any) {
      toast({ title: 'Chyba', description: error?.message, variant: 'destructive' });
    }
  }

  async function handleDeleteUser(userId: Id<'user_profiles'>) {
    if (!confirm('Opravdu chcete smazat tohoto uživatele?')) return;
    try {
      await removeUser({ id: userId });
      toast({ title: 'Úspěch', description: 'Uživatel byl smazán' });
    } catch (error: any) {
      toast({ title: 'Chyba', description: error?.message, variant: 'destructive' });
    }
  }

  async function toggleNotifications(user: UiUser) {
    try {
      // update expects a full patch (all fields are optional but present in the
      // validator); pass through the current values and flip only the toggle.
      await updateUser({
        id: user.id,
        patch: {
          email: user.email,
          fullName: user.full_name,
          notificationEnabled: !user.notification_enabled,
        },
      });
      toast({
        title: 'Úspěch',
        description: 'Nastavení notifikací bylo změněno',
      });
    } catch (error: any) {
      toast({ title: 'Chyba', description: error?.message, variant: 'destructive' });
    }
  }

  if (loading) {
    return <div className="p-4">Načítání...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Správa uživatelů</h2>

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

          <div>
            <Label htmlFor="password">Heslo (pro přihlášení)</Label>
            <Input
              id="password"
              type="text"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="např. honza123"
            />
          </div>

          <Button type="submit" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Přidat uživatele
          </Button>
        </form>

        <div className="space-y-2">
          <h3 className="font-semibold mb-4">Uživatelé ({users.length})</h3>

          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-4 p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="font-medium">{user.full_name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>

              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  value={passwordDrafts[user.id] ?? ''}
                  onChange={(e) =>
                    setPasswordDrafts((prev) => ({ ...prev, [user.id]: e.target.value }))
                  }
                  placeholder="Nové heslo"
                  className="h-9 w-32"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetPassword(user)}
                  disabled={!passwordDrafts[user.id]?.trim()}
                  title="Nastavit heslo"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={user.notification_enabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleNotifications(user)}
                  title={
                    user.notification_enabled
                      ? 'Notifikace zapnuty'
                      : 'Notifikace vypnuty'
                  }
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
