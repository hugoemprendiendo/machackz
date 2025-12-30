
"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import React from 'react';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDataContext } from "@/context/data-context";
import { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusColors: Record<OrderStatus, string> = {
  "Abierta": "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  "En Progreso": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  "Esperando Piezas": "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
  "Listo para Entrega": "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  "Entregada / Cerrada": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  "Cancelada": "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};


export function RecentOrders() {
  const { orders } = useDataContext();
  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
          <CardTitle>Órdenes Recientes</CardTitle>
          <CardDescription>
            Un vistazo a las últimas órdenes de servicio.
          </CardDescription>
        </div>
        <Button asChild size="sm" className="ml-auto gap-1">
          <Link href="/orders">
            Ver Todas
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Dispositivo</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOrders.map(order => {
                const total = order.parts.reduce((sum, part) => {
                    const partTotal = part.quantity * part.unitPrice;
                    const tax = partTotal * (part.taxRate / 100);
                    return sum + partTotal + tax;
                }, 0);
                return (
                    <TableRow key={order.id}>
                        <TableCell>
                            <div className="font-medium">{order.customerName}</div>
                            <div className="hidden text-sm text-muted-foreground md:inline">
                                {order.contactInfo}
                            </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{order.deviceType} {order.deviceModel}</TableCell>
                        <TableCell className="text-right">${total.toFixed(2)}</TableCell>
                        <TableCell>
                            <Badge className={cn("text-xs", statusColors[order.status])} variant="outline">
                                {order.status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
