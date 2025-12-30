"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { OverviewChart } from "@/components/dashboard/overview-chart";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido a MacHackz. Aquí tienes un resumen de tu taller.</p>
      </div>
      
      <StatsCards />

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <OverviewChart />
        <RecentOrders />
      </div>
    </div>
  );
}
