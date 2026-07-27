import { AuthorManager } from '@/components/settings/AuthorManager';
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
            Členové týmu
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifikace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <AuthorManager />
        </TabsContent>

        <TabsContent value="notifications">
          <div className="p-6 space-y-2">
            <h2 className="text-xl font-semibold mb-4">Nastavení notifikací</h2>
            <p className="text-muted-foreground">
              Emailové notifikace se odesílají automaticky, když někoho označíte (@)
              v komentáři u příspěvku. Odesílají se z adresy <strong>info@socka.site</strong>.
            </p>
            <p className="text-muted-foreground">
              Aby notifikace dorazila, musí mít člen týmu vyplněný email v záložce
              <strong> Členové týmu</strong>.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
