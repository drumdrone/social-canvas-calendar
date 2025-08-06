import { SocialCalendar } from '@/components/SocialCalendar';
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10">
        <Button onClick={logout} variant="outline">
          Logout
        </Button>
      </div>
      <SocialCalendar />
    </div>
  );
};

export default Index;