import { createRoot } from 'react-dom/client'
import { ConvexProvider } from 'convex/react'
import { convex } from '@/integrations/convex/client'
import { currentTenant, migrateLegacyStorage } from '@/config/tenants'
import App from './App.tsx'
import './index.css'

const root = createRoot(document.getElementById("root")!);

if (!currentTenant) {
  // socka.site/ (or an unknown company) — intentionally empty.
  root.render(<div className="min-h-screen bg-background" />);
} else if (!convex) {
  root.render(
    <div className="min-h-screen flex items-center justify-center bg-background p-4 text-muted-foreground">
      Firma {currentTenant.name} zatím nemá nastavenou databázi.
    </div>,
  );
} else {
  migrateLegacyStorage();
  document.title = `${currentTenant.name} – Social Canvas Calendar`;
  root.render(
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  );
}
