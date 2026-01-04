
"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DataProvider, useDataContext } from "@/context/data-context";
import { DashboardLayoutSkeleton } from "@/components/layout/dashboard-layout-skeleton";
import React from "react";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading: isDataLoading } = useDataContext();
  const { isUserLoading, user } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    // If auth state is resolved and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);


  if (isDataLoading || isUserLoading) {
    return <DashboardLayoutSkeleton />;
  }
  
  if (!user) {
     return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex h-screen flex-col flex-1">
        <AppHeader />
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DataProvider>
  );
}

    