
"use client";

import { PlusCircle, MoreHorizontal, Trash2, Wand2 } from "lucide-react";
import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDataContext } from "@/context/data-context";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { StockEntry } from "@/lib/types";

function DeletePurchaseDialog({ purchase, onConfirm }: { purchase: StockEntry, onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive focus:bg-destructive/10">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Eliminar</span>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Esto eliminará permanentemente la compra con factura <span className="font-bold">{purchase.invoiceNumber}</span>. La cantidad de stock de los productos <span className="font-bold">no</span> se revertirá automáticamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">Eliminar Compra</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function PurchasesPage() {
  const { stockEntries, deleteStockEntry } = useDataContext();
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = (entry: StockEntry) => {
    deleteStockEntry(entry.id);
    toast({
        title: "Compra Eliminada",
        description: `La compra con factura ${entry.invoiceNumber} ha sido eliminada.`
    });
  }

  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold tracking-tight">Compras</h1>
                <p className="text-muted-foreground">Registra y visualiza las entradas de mercancía.</p>
            </div>
            <div className="flex gap-2">
                <Button asChild variant="outline">
                    <Link href="/purchases/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nueva Compra (Manual)
                    </Link>
                </Button>
                 <Button asChild>
                    <Link href="/purchases/import">
                        <Wand2 className="mr-2 h-4 w-4" />
                        Importar con Factura (IA)
                    </Link>
                </Button>
            </div>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Historial de Compras</CardTitle>
                <CardDescription>Todas las facturas y entradas de almacén registradas.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Factura No.</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>
                        <span className="sr-only">Actions</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {stockEntries.map((entry) => {
                        const date = parseISO(entry.date);
                        const timezoneOffset = date.getTimezoneOffset();
                        const adjustedDate = new Date(date.valueOf() + timezoneOffset * 60 * 1000);
                        
                        return (
                        <TableRow key={entry.id}>
                            <TableCell className="font-medium">
                                <Link href={`/purchases/${entry.id}`} className="text-primary hover:underline">
                                    {entry.invoiceNumber}
                                </Link>
                            </TableCell>
                            <TableCell>{entry.supplierName}</TableCell>
                            <TableCell>{format(adjustedDate, "dd/MM/yyyy")}</TableCell>
                            <TableCell className="text-right">${entry.totalCost.toFixed(2)}</TableCell>
                            <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => router.push(`/purchases/${entry.id}`)}>Ver/Editar Detalles</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DeletePurchaseDialog purchase={entry} onConfirm={() => handleDelete(entry)} />
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )})}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
