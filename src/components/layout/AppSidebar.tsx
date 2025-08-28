import React from 'react';
import { Calendar, LayoutDashboard, FileText, Grid3X3, LogOut, User, RefreshCw } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const navigation = [
  {
    name: 'Calendar',
    href: '/',
    icon: Calendar,
  },
  {
    name: 'Mood Board',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Matrix',
    href: '/matrix',
    icon: Grid3X3,
  },
  {
    name: 'Plan',
    href: '/plan',
    icon: FileText,
  },
];

export const AppSidebar: React.FC = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, logout, refreshSession, sessionExpiresAt, isAuthenticated } = useAuth();

  const isActive = (path: string) => currentPath === path;
  const isExpanded = navigation.some((item) => isActive(item.href));

  const handleLogout = async () => {
    await logout();
  };

  const handleRefreshSession = async () => {
    await refreshSession();
  };

  const getSessionStatus = () => {
    if (!sessionExpiresAt) return null;
    const now = new Date();
    const timeLeft = sessionExpiresAt.getTime() - now.getTime();
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));
    
    if (minutesLeft < 10) {
      return { status: 'warning', text: `${minutesLeft}m left` };
    }
    return { status: 'good', text: 'Active' };
  };

  const sessionStatus = getSessionStatus();

  return (
    <Sidebar>
      <SidebarHeader className="p-6 hidden lg:block">
        <h2 className="text-lg font-semibold text-foreground truncate">
          {state === "collapsed" ? "SMM" : "Social Media Manager"}
        </h2>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="hidden lg:block">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className={cn(
                          "truncate",
                          state === "collapsed" && "sr-only"
                        )}>
                          {item.name}
                        </span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {isAuthenticated && (
        <SidebarFooter className="p-4 border-t border-border">
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email}
                </p>
                {sessionStatus && (
                  <p className={cn(
                    "text-xs",
                    sessionStatus.status === 'warning' 
                      ? "text-yellow-600 dark:text-yellow-400" 
                      : "text-muted-foreground"
                  )}>
                    Session: {sessionStatus.text}
                  </p>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefreshSession}
                className="flex-1 justify-start gap-2 h-8"
              >
                <RefreshCw className="h-3 w-3" />
                {state === "collapsed" ? null : "Refresh"}
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="flex-1 justify-start gap-2 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
              >
                <LogOut className="h-3 w-3" />
                {state === "collapsed" ? null : "Logout"}
              </Button>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
};