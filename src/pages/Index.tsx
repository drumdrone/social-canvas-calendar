import { SocialCalendar } from '@/components/SocialCalendar';
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';

const Index = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return <SocialCalendar />;
};

export default Index;