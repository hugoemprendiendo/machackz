
"use client";

import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import React from "react";
import { format, parseISO } from 'date-fns';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { StockLot } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";


const inventoryFormSchema = z.object({
  name: z.string().min(3, "El nombre del producto es requerido."),
  category: z.string().min(3, "La categoría es requerida."),
  sku: z.string().optional(),
  costPrice: z.coerce.number().min(0, "El costo debe ser un número positivo."),
  sellingPrice: z.coerce.number().min(0, "El precio de venta debe ser un número positivo."),
  stock: z.coerce.number().int("El stock debe ser un número entero.").min(0),
  minStock: z.coerce.number().int("El stock mínimo debe ser un número entero.").min(0),
  hasTax: z.boolean().default(true),
  taxRate: z.coerce.number().min(0, "El impuesto debe ser un número positivo."),
  isService: z.boolean().default(false),
});

type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

export default function EditInventoryPage() {
  const router = useRouter();
  const params = useParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { inventory, updateInventoryItem, stockEntries } = useDataContext();
  
  const [stockLots, setStockLots] = React.useState<StockLot[]>([]);
  const [isLoadingLots, setIsLoadingLots] = React.useState(true);

  const item = React.useMemo(() => inventory.find((i) => i.id === params.id), [inventory, params.id]);

  React.useEffect(() => {
    if (item && !item.isService && firestore) {
      const fetchLots = async () => {
        setIsLoadingLots(true);
        const lotsRef = collection(firestore, `inventory/${item.id}/stockLots`);
        const q = query(lotsRef, where("quantity", ">", 0), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        const lots = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockLot));
        setStockLots(lots);
        setIsLoadingLots(false);
      };
      fetchLots();
    } else {
        setIsLoadingLots(false);
    }
  }, [item, firestore]);

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
  });

  React.useEffect(() => {
    if (item) {
      form.reset({
        ...item,
        hasTax: item.hasTax ?? true,
        taxRate: item.taxRate ?? 16,
        isService: item.isService ?? false,
      });
    }
  }, [item, form]);
  
  const isService = form.watch("isService");

  const onSubmit = (data: InventoryFormValues) => {
    if (item) {
      updateInventoryItem({
        id: item.id,
        ...data,
        sku: data.sku || '',
        taxRate: data.hasTax ? data.taxRate : 0,
        stock: data.isService ? 0 : data.stock,
        minStock: data.isService ? 0 : data.minStock,
      });
      toast({
        title: "Producto Actualizado",
        description: `El producto ${data.name} ha sido actualizado.`,
      });
      router.push("/products");
    }
  };
  
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-4xl font-bold">Producto no encontrado</h1>
        <p className="text-muted-foreground">
          El producto que buscas no existe o ha sido eliminado.
        </p>
        <Button asChild className="mt-4">
          <Link href="/products">Volver a Productos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Volver</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
          {item.isService ? 'Editar Servicio' : 'Editar Producto'}
        </h1>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/products")}
          >
            Cancelar
          </Button>
          <Button type="submit" form="inventory-edit-form">
            Guardar Cambios
          </Button>
        </div>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <form
                id="inventory-edit-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
            >
                <Card>
                <CardHeader>
                    <CardTitle>Detalles del Producto</CardTitle>
                    <CardDescription>
                    Actualiza la información del item.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Producto</Label>
                    <Input
                        id="name"
                        {...form.register("name")}
                        placeholder="Ej. SSD 1TB Kingston"
                    />
                    {form.formState.errors.name && (
                        <p className="text-sm text-destructive">
                        {form.formState.errors.name.message}
                        </p>
                    )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="category">Categoría</Label>
                        <Input
                        id="category"
                        {...form.register("category")}
                        placeholder="Ej. Almacenamiento"
                        />
                        {form.formState.errors.category && (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.category.message}
                        </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sku">SKU (Opcional)</Label>
                        <Input
                        id="sku"
                        {...form.register("sku")}
                        placeholder="Ej. KNG-SSD-1TB"
                        />
                    </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="costPrice">Precio de Costo (Referencia)</Label>
                        <Input
                        id="costPrice"
                        type="number"
                        step="0.01"
                        {...form.register("costPrice")}
                        placeholder="0.00"
                        />
                        {form.formState.errors.costPrice && (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.costPrice.message}
                        </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sellingPrice">Precio de Venta</Label>
                        <Input
                        id="sellingPrice"
                        type="number"
                        step="0.01"
                        {...form.register("sellingPrice")}
                        placeholder="0.00"
                        />
                        {form.formState.errors.sellingPrice && (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.sellingPrice.message}
                        </p>
                        )}
                    </div>
                    </div>
                    <div className="flex items-center space-x-2">
                    <Controller
                        control={form.control}
                        name="isService"
                        render={({ field }) => (
                        <Switch
                            id="isService"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        )}
                    />
                    <Label htmlFor="isService">Es un servicio (no se inventaría)</Label>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="stock">Stock Actual</Label>
                        <Input
                        id="stock"
                        type="number"
                        {...form.register("stock")}
                        placeholder="0"
                        disabled={isService}
                        readOnly
                        className="bg-muted/50"
                        />
                        {form.formState.errors.stock && (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.stock.message}
                        </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="minStock">Stock Mínimo</Label>
                        <Input
                        id="minStock"
                        type="number"
                        {...form.register("minStock")}
                        placeholder="0"
                        disabled={isService}
                        />
                        {form.formState.errors.minStock && (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.minStock.message}
                        </p>
                        )}
                    </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 items-center">
                        <div className="flex items-center space-x-2 pt-6">
                            <Controller
                                control={form.control}
                                name="hasTax"
                                render={({ field }) => (
                                    <Checkbox
                                        id="hasTax"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                            <Label htmlFor="hasTax">Producto lleva IVA</Label>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taxRate">Porcentaje de Impuesto (%)</Label>
                            <Input id="taxRate" type="number" {...form.register("taxRate")} placeholder="16" disabled={!form.watch("hasTax")} />
                        </div>
                    </div>
                </CardContent>
                </Card>
            </form>
        </div>

        <div className="space-y-8">
            {!item.isService && (
                <Card>
                    <CardHeader>
                        <CardTitle>Lotes de Stock</CardTitle>
                        <CardDescription>Desglose del stock actual por factura de compra (FIFO).</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Factura</TableHead>
                                    <TableHead>Fecha Compra</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead className="text-right">Costo Unit.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingLots ? (
                                     <TableRow><TableCell colSpan={4} className="text-center">Cargando lotes...</TableCell></TableRow>
                                ) : stockLots.length > 0 ? (
                                    stockLots.map(lot => {
                                        const purchase = stockEntries.find(entry => entry.id === lot.purchaseId);
                                        return (
                                            <TableRow key={lot.id}>
                                                <TableCell>
                                                  {purchase ? (
                                                      <Link href={`/purchases/${purchase.id}`} className="text-primary hover:underline">
                                                        {purchase.invoiceNumber || 'N/A'}
                                                      </Link>
                                                  ) : (
                                                    <Badge variant="secondary">{lot.purchaseId === 'MIGRATION-INITIAL' ? 'Lote Inicial' : lot.purchaseId}</Badge>
                                                  )}
                                                </TableCell>
                                                <TableCell>{format(parseISO(lot.purchaseDate), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-right">{lot.quantity}</TableCell>
                                                <TableCell className="text-right">${lot.costPrice.toFixed(2)}</TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                     <TableRow><TableCell colSpan={4} className="text-center">No hay lotes de stock para este producto.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
