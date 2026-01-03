
"use client";

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
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDataContext } from "@/context/data-context";
import Link from "next/link";
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AggregatedPart {
  itemId: string;
  name: string;
  sku: string;
  totalQuantity: number;
  totalCostValue: number;
  orders: { id: string; customerName: string; quantity: number }[];
}

export default function InventoryInOrdersPage() {
  const { orders, inventory } = useDataContext();
  const router = useRouter();

  const {committedStock, totalCommittedValue} = React.useMemo(() => {
    const openOrders = orders.filter(o => 
        o.status === 'Abierta' || 
        o.status === 'En Progreso' || 
        o.status === 'Esperando Piezas'
    );
    
    const partsMap = new Map<string, AggregatedPart>();
    let totalValue = 0;

    openOrders.forEach(order => {
      order.parts.forEach(part => {
        const product = inventory.find(i => i.id === part.itemId);
        if (product && !product.isService) {
          if (!partsMap.has(part.itemId)) {
            partsMap.set(part.itemId, {
              itemId: part.itemId,
              name: product.name,
              sku: product.sku,
              totalQuantity: 0,
              totalCostValue: 0,
              orders: [],
            });
          }
          const aggregated = partsMap.get(part.itemId)!;
          aggregated.totalQuantity += part.quantity;
          aggregated.totalCostValue += part.unitCost * part.quantity;
          aggregated.orders.push({
            id: order.id,
            customerName: order.customerName,
            quantity: part.quantity,
          });
          totalValue += part.unitCost * part.quantity;
        }
      });
    });

    return {
      committedStock: Array.from(partsMap.values()),
      totalCommittedValue: totalValue,
    };
  }, [orders, inventory]);

  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold tracking-tight">Inventario en Órdenes Abiertas</h1>
                <p className="text-muted-foreground">Partes reservadas para reparaciones en curso.</p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Inventario
            </Button>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Stock Comprometido</CardTitle>
          <CardDescription>
            Estas son las partes del inventario que están asignadas a órdenes de servicio abiertas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Cant. Total Reservada</TableHead>
                <TableHead className="text-right">Valor de Costo</TableHead>
                <TableHead className="text-center">En Órdenes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {committedStock.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                            No hay inventario comprometido en órdenes abiertas actualmente.
                        </TableCell>
                    </TableRow>
                )}
              {committedStock.map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell className="font-medium">
                      <Link href={`/inventory/${item.itemId}`} className="text-primary hover:underline">
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell className="text-right font-bold">{item.totalQuantity}</TableCell>
                    <TableCell className="text-right font-medium">${item.totalCostValue.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="link" size="sm">
                                    {item.orders.length} {item.orders.length === 1 ? 'orden' : 'órdenes'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Órdenes para {item.name}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Desglose de órdenes que utilizan esta parte.
                                        </p>
                                    </div>
                                    <div className="grid gap-2 text-sm">
                                        {item.orders.map((orderInfo, index) => (
                                            <div key={index} className="grid grid-cols-[1fr_auto] items-center">
                                                <div>
                                                    <Link href={`/orders/${orderInfo.id}`} className="text-primary hover:underline font-medium">
                                                        {orderInfo.id}
                                                    </Link>
                                                    <p className="text-xs text-muted-foreground">{orderInfo.customerName}</p>
                                                </div>
                                                <Badge variant="secondary">Cant: {orderInfo.quantity}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
            <TableFooter>
                <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={3} className="text-right">Valor Total Comprometido</TableCell>
                    <TableCell className="text-right">${totalCommittedValue.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
