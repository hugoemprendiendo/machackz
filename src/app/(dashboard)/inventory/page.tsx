
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
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDataContext } from "@/context/data-context";
import Link from "next/link";
import { cn } from "@/lib/utils";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

export default function InventoryStockPage() {
  const { inventory } = useDataContext();
  
  const physicalInventory = React.useMemo(() => 
    inventory.filter(item => !item.isService && item.stock > 0), 
    [inventory]
  );

  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold tracking-tight">Inventario de Stock</h1>
                <p className="text-muted-foreground">Consulta el stock físico disponible y su valor.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/inventory/in-orders">
                <Wrench className="mr-2 h-4 w-4" />
                Ver Inventario en Órdenes Abiertas
              </Link>
            </Button>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Stock Físico Actual</CardTitle>
          <CardDescription>Lista de productos con unidades disponibles en el inventario.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Stock Actual</TableHead>
                <TableHead className="text-right">Valor de Costo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {physicalInventory.map((item) => {
                const isLowStock = item.stock <= item.minStock;
                const inventoryValue = item.costPrice * item.stock;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <Link href={`/inventory/${item.id}`} className="text-primary hover:underline">
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">{item.stock}</TableCell>
                    <TableCell className="text-right font-medium">${inventoryValue.toFixed(2)}</TableCell>
                    <TableCell>
                      {isLowStock ? (
                        <Badge variant="destructive">Stock Bajo</Badge>
                      ) : (
                        <Badge variant="secondary">En Stock</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
