"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataContext } from "@/context/data-context";
import { Wrench, Boxes, Truck, CheckCircle } from "lucide-react";
import React from "react";

export function StatsCards() {
  const { orders, inventory } = useDataContext();

  const activeOrders = orders.filter(o => o.status === 'Abierta' || o.status === 'En Progreso' || o.status === 'Esperando Piezas').length;
  const lowStockItems = inventory.filter(i => i.stock <= i.minStock).length;
  const readyForDelivery = orders.filter(o => o.status === 'Listo para Entrega').length;
  const completedThisMonth = orders.filter(o => {
    if (o.status !== 'Entregada / Cerrada' || !o.closedAt) return false;
    const closedDate = new Date(o.closedAt);
    const today = new Date();
    return closedDate.getMonth() === today.getMonth() && closedDate.getFullYear() === today.getFullYear();
  }).length;

  const stats = [
    { title: "Órdenes Activas", value: activeOrders, icon: Wrench, description: "Reparaciones en curso" },
    { title: "Stock Bajo", value: lowStockItems, icon: Boxes, description: "Items que necesitan reabastecimiento" },
    { title: "Listos para Entrega", value: readyForDelivery, icon: Truck, description: "Equipos esperando ser recogidos" },
    { title: "Completados este Mes", value: completedThisMonth, icon: CheckCircle, description: "Órdenes cerradas en el mes" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
