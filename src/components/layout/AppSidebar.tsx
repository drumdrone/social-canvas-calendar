import React from 'react';
import { Calendar, LayoutDashboard, FileText, Grid3X3, Settings, CalendarDays } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { useRightSidebar } from '@/contexts/RightSidebarContext';

const navigation = [
  {
    name: 'Plan',
    href: '/plan',
    icon: FileText,
  },
  {
    name: 'Calendar',
    href: '/calendar',
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
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export const AppSidebar: React.FC = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { toggle: toggleRightSidebar, isOpen: isRightSidebarOpen } = useRightSidebar();

  const isActive = (path: string) => currentPath === path;

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

        <SidebarGroup>
          <SidebarGroupLabel className="hidden lg:block">Quick View</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={toggleRightSidebar}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full',
                      isRightSidebarOpen
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <CalendarDays className="h-5 w-5 flex-shrink-0" />
                    <span className={cn(
                      "truncate",
                      state === "collapsed" && "sr-only"
                    )}>
                      Quick Calendar
                    </span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};