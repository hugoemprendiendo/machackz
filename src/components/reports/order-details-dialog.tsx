
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import type { Order, Client } from "@/lib/types";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

interface OrderDetailsDialogProps {
  order: Order;
  client: Client | undefined;
  children: React.ReactNode;
}

const statusColors: Record<Order["status"], string> = {
    'Abierta': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'En Progreso': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    'Esperando Piezas': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    'Listo para Entrega': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'Entregada / Cerrada': 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'Cancelada': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};


export function OrderDetailsDialog({ order, client, children }: OrderDetailsDialogProps) {
    const { partsSubtotal, taxTotal, total, totalCost, profit } = React.useMemo(() => {
        const subtotal = order.parts.reduce((sum, part) => sum + part.unitPrice * part.quantity, 0);
        const tax = order.parts.reduce((sum, part) => {
            const partTotal = part.unitPrice * part.quantity;
            const partTax = partTotal * (part.taxRate / 100);
            return sum + partTax;
        }, 0);
        const cost = order.parts.reduce((sum, part) => sum + part.unitCost * part.quantity, 0);

        return {
            partsSubtotal: subtotal,
            taxTotal: tax,
            total: subtotal + tax,
            totalCost: cost,
            profit: subtotal - cost,
        }
    }, [order.parts]);
  
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalle de Orden: {order.id}</span>
             <Badge className={cn("text-xs font-medium", statusColors[order.status])} variant="outline">
                {order.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Creada el {format(parseISO(order.createdAt), "dd/MM/yyyy")}
            {order.closedAt && `, cerrada el ${format(parseISO(order.closedAt), "dd/MM/yyyy")}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
          {/* Client & Device Info */}
          <div className="space-y-4">
             <div>
                <h4 className="font-semibold text-sm mb-2">Cliente</h4>
                <p className="text-sm font-medium">{client?.name}</p>
                <p className="text-xs text-muted-foreground">{client?.email} | {client?.phone}</p>
             </div>
             <Separator/>
             <div>
                <h4 className="font-semibold text-sm mb-2">Dispositivo</h4>
                <p className="text-sm">{order.brand} {order.deviceModel}</p>
                <p className="text-xs text-muted-foreground">Serie: {order.serialNumber || 'N/A'}</p>
             </div>
             <Separator/>
             <div>
                <h4 className="font-semibold text-sm mb-2">Problema Reportado</h4>
                <p className="text-xs text-muted-foreground">{order.problemDescription}</p>
             </div>
             <Separator/>
             <div>
                <h4 className="font-semibold text-sm mb-2">Diagnóstico Técnico</h4>
                <p className="text-xs text-muted-foreground">{order.diagnosis}</p>
             </div>
          </div>
          
          {/* Parts and Totals */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Partes y Costos</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.parts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                      No se usaron partes en esta orden.
                    </TableCell>
                  </TableRow>
                ) : (
                  order.parts.map((part) => (
                    <TableRow key={part.itemId} className="text-xs">
                      <TableCell className="font-medium">{part.name}</TableCell>
                      <TableCell>{part.quantity}</TableCell>
                      <TableCell className="text-right">${(part.unitPrice * part.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Separator className="my-2"/>
            <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>${partsSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA:</span>
                    <span>${taxTotal.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-bold text-base mt-1 pt-1 border-t">
                    <span>Total Cobrado:</span>
                    <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                    <span className="text-muted-foreground">Costo Partes:</span>
                    <span>-${totalCost.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-bold text-green-600 mt-1 pt-1 border-t">
                    <span>Ganancia:</span>
                    <span>${profit.toFixed(2)}</span>
                </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" asChild>
            <Link href={`/orders/${order.id}`}>Ir a la Orden</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
