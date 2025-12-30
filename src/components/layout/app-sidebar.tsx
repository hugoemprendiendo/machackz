"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Building2,
  LayoutDashboard,
  Package2,
  CircleUser,
  ShoppingCart,
  Users,
  Wrench,
  LineChart,
  Settings,
  Receipt,
} from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useDataContext } from "@/context/data-context";

const menuItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/orders", icon: Wrench, label: "Órdenes" },
    { href: "/inventory", icon: Boxes, label: "Inventario", isLowStock: true },
    { href: "/clients", icon: Users, label: "Clientes" },
    { href: "/suppliers", icon: Building2, label: "Proveedores" },
    { href: "/purchases", icon: ShoppingCart, label: "Compras" },
    { href: "/expenses", icon: Receipt, label: "Gastos" },
    { href: "/reports", icon: LineChart, label: "Reportes" },
    { href: "/settings", icon: Settings, label: "Configuración" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { inventory } = useDataContext();

  const lowStockCount = inventory.filter(item => item.stock <= item.minStock).length;

  return (
    <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <Button variant="ghost" className="h-10 w-full justify-start px-2 text-primary hover:text-primary" asChild>
              <Link href="/dashboard">
                  <Package2 className="h-6 w-6" />
                  <span className="text-lg font-headline font-semibold">MacHackz</span>
              </Link>
          </Button>
        </SidebarHeader>

        <SidebarContent className="p-2">
            <SidebarMenu>
                {menuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                            tooltip={{children: item.label}}
                        >
                            <Link href={item.href} passHref>
                                <item.icon />
                                <span>
                                    {item.label}
                                </span>
                                {item.isLowStock && lowStockCount > 0 && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">{lowStockCount}</Badge>}
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-2">
        </SidebarFooter>
    </Sidebar>
  );
}
