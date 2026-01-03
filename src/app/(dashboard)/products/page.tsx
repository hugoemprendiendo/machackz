
"use client";

import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useDataContext } from "@/context/data-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem } from "@/lib/types";

function DeleteItemDialog({ itemId, itemName, onConfirm }: { itemId: string, itemName: string, onConfirm: () => void }) {
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
            Esta acción no se puede deshacer. Esto eliminará permanentemente el producto <span className="font-bold">{itemName}</span>. Esta acción no afecta el stock, solo la definición del producto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ProductsPage() {
  const { inventory, deleteInventoryItem } = useDataContext();
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = (item: InventoryItem) => {
    deleteInventoryItem(item.id);
    toast({
        title: "Producto Eliminado",
        description: `El producto ${item.name} ha sido eliminado.`
    })
  }

  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold tracking-tight">Productos y Servicios</h1>
                <p className="text-muted-foreground">Gestiona todos los artículos y servicios que ofreces.</p>
            </div>
            <Button asChild>
                <Link href="/inventory/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Producto/Servicio
                </Link>
            </Button>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Productos</CardTitle>
          <CardDescription>Lista de todos los productos y servicios registrados.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio Venta</TableHead>
                <TableHead className="text-right">Precio Costo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => {
                return (
                  <TableRow key={item.id} >
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">${item.sellingPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${item.costPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.isService ? (
                         <Badge variant="outline">Servicio</Badge>
                      ) : (
                        <Badge variant="secondary">Producto Físico</Badge>
                      )}
                    </TableCell>
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
                            <DropdownMenuItem onClick={() => router.push(`/inventory/${item.id}`)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             <DeleteItemDialog itemId={item.id} itemName={item.name} onConfirm={() => handleDelete(item)} />
                          </DropdownMenuContent>
                        </DropdownMenu>
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
