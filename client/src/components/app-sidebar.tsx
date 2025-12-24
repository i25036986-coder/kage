import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { PanelBackgroundLayer } from "@/components/panel-background";
import {
  LayoutGrid,
  Plus,
  Download,
  History,
  Copy,
  PlayCircle,
  FileText,
  Wrench,
  Settings,
  Rocket,
  TreeDeciduous,
  Building2,
  Zap,
  Shield,
} from "lucide-react";
import type { AppSettings } from "@shared/schema";

const mainNavItems = [
  { title: "Library", icon: LayoutGrid, href: "/" },
  { title: "Add New", icon: Plus, href: "/add" },
  { title: "Vault", icon: Shield, href: "/vault" },
  { title: "Downloads", icon: Download, href: "/downloads" },
  { title: "History", icon: History, href: "/history" },
  { title: "Duplicates", icon: Copy, href: "/duplicates" },
  { title: "Local Player", icon: PlayCircle, href: "/player" },
  { title: "Metadata", icon: FileText, href: "/metadata" },
  { title: "System Tools", icon: Wrench, href: "/tools" },
];

const genreItems = [
  { title: "Sci-Fi", icon: Rocket, href: "/genre/sci-fi" },
  { title: "Nature", icon: TreeDeciduous, href: "/genre/nature" },
  { title: "Architecture", icon: Building2, href: "/genre/architecture" },
];

interface AppSidebarProps {
  transparent?: boolean;
}

export function AppSidebar({ transparent = false }: AppSidebarProps) {
  const [location] = useLocation();
  
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
    staleTime: 1000 * 60,
  });

  const hasSidebarBg = settings?.sidebarBackground && settings.sidebarBackground.mode !== "default";

  return (
    <Sidebar collapsible="icon" className={`relative ${transparent || hasSidebarBg ? "!bg-sidebar/70 backdrop-blur-sm" : ""}`}>
      {hasSidebarBg && (
        <PanelBackgroundLayer background={settings.sidebarBackground} />
      )}
      <SidebarHeader className="p-4">
        <Link href="/" data-testid="link-home">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Vault UI
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {isActive && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Genres
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {genreItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href} data-testid={`link-genre-${item.title.toLowerCase()}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location === "/settings"}
              tooltip="Settings"
            >
              <Link href="/settings" data-testid="link-settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
