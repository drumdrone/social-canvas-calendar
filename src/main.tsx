import { createRoot } from 'react-dom/client'
import { ConvexProvider } from 'convex/react'
import { convex } from '@/integrations/convex/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
);
