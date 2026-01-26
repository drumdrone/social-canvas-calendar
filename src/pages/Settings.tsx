import { UserManagement } from '@/components/users/UserManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Bell } from 'lucide-react';

export default function Settings() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Nastavení</h1>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Uživatelé
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifikace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="notifications">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Nastavení notifikací</h2>
            <p className="text-gray-600">
              Email notifikace jsou odesílány automaticky při @mention v komentářích.
              Každý uživatel může zapnout/vypnout notifikace v sekci Uživatelé.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
