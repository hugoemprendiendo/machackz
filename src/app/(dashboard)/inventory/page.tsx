
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
import { Wrench } from "lucide-react";

export default function InventoryStockPage() {
  const { inventory } = useDataContext();
  
  const physicalInventory = React.useMemo(() => 
    inventory.filter(item => !item.isService), 
    [inventory]
  );

  const totalInventoryValue = React.useMemo(() =>
    physicalInventory.reduce((total, item) => total + (item.costPrice * item.stock), 0),
    [physicalInventory]
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
              {physicalInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay productos en el inventario.
                  </TableCell>
                </TableRow>
              ) : (
                physicalInventory.map((item) => {
                  const isLowStock = item.stock > 0 && item.stock <= item.minStock;
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
                        {item.stock === 0 ? (
                          <Badge variant="outline">Sin Stock</Badge>
                        ) : isLowStock ? (
                          <Badge variant="destructive">Stock Bajo</Badge>
                        ) : (
                          <Badge variant="secondary">En Stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            <TableFooter>
                <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4} className="text-right">Valor Total del Inventario</TableCell>
                    <TableCell className="text-right">${totalInventoryValue.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
