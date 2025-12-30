import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
} from "@/components/ui/sidebar";

export function DashboardLayoutSkeleton() {
  return (
    <SidebarProvider>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="hidden md:block"
      >
        <SidebarHeader className="p-2">
          <Skeleton className="h-10 w-full" />
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {[...Array(8)].map((_, i) => (
              <SidebarMenuItem key={i}>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <div className="flex h-screen flex-col flex-1">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <div className="w-full flex-1">
            <Skeleton className="h-8 w-full md:w-2/3 lg:w-1/3" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </header>
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 md:p-8">
          <Skeleton className="h-full w-full" />
        </main>
      </div>
    </SidebarProvider>
  );
}
