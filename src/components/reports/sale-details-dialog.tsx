
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
import type { Sale, Client } from "@/lib/types";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

interface SaleDetailsDialogProps {
  sale: Sale;
  client: Client | undefined;
  children: React.ReactNode;
}

const statusColors: Record<Sale["status"], string> = {
    'Borrador': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    'Completada': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'Cancelada': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};


export function SaleDetailsDialog({ sale, client, children }: SaleDetailsDialogProps) {
    const cost = sale.items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
    const profit = sale.total - cost;
  
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalle de Venta: {sale.id}</span>
             <Badge className={cn("text-xs font-medium", statusColors[sale.status])} variant="outline">
                {sale.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Creada el {format(parseISO(sale.createdAt), "dd/MM/yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-4">
             <div>
                <h4 className="font-semibold text-sm mb-2">Cliente</h4>
                <p className="text-sm font-medium">{client?.name}</p>
                <p className="text-xs text-muted-foreground">{client?.email} | {client?.phone}</p>
             </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-sm mb-2">Items y Costos</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                      No hay items en esta venta.
                    </TableCell>
                  </TableRow>
                ) : (
                  sale.items.map((part) => (
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
                    <span>${sale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA:</span>
                    <span>${sale.taxTotal.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-bold text-base mt-1 pt-1 border-t">
                    <span>Total Cobrado:</span>
                    <span>${sale.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                    <span className="text-muted-foreground">Costo Productos:</span>
                    <span>-${cost.toFixed(2)}</span>
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
            <Link href={`/sales/${sale.id}`}>Ir a la Venta</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


    