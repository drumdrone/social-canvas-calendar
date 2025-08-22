import React from 'react';
import { Calendar, LayoutDashboard, FileText, Grid3X3 } from 'lucide-react';
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

  const isActive = (path: string) => currentPath === path;
  const isExpanded = navigation.some((item) => isActive(item.href));

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
    </Sidebar>
  );
};