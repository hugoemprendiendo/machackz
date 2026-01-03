

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, PlusCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import { NewProductDialog } from "@/components/inventory/new-product-dialog";
import type { InventoryItem, StockEntryItem } from "@/lib/types";

const purchaseItemSchema = z.object({
  itemId: z.string().min(1, "Selecciona un producto."),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1."),
  unitCost: z.coerce.number().min(0, "El costo debe ser positivo."),
});

const purchaseFormSchema = z.object({
  supplierId: z.string({ required_error: "Por favor selecciona un proveedor." }),
  invoiceNumber: z.string().min(3, "El número de factura es requerido.").optional().or(z.literal('')),
  date: z.string(),
  items: z.array(purchaseItemSchema).min(1, "Debes añadir al menos un producto."),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

export default function NewPurchasePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { suppliers, inventory, addStockEntry } = useDataContext();
  const [isProductDialogOpen, setProductDialogOpen] = React.useState(false);
  const [lastCreatedProduct, setLastCreatedProduct] = React.useState<InventoryItem | null>(null);
  
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      items: [],
      invoiceNumber: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const { subtotal, taxTotal, totalCost } = React.useMemo(() => {
      const calculated = (watchedItems || []).reduce((acc, item) => {
          const product = inventory.find(p => p.id === item.itemId);
          const itemCost = (item.quantity || 0) * (item.unitCost || 0);
          
          acc.subtotal += itemCost;
          if (product?.hasTax) {
              acc.taxTotal += itemCost * ((product.taxRate || 0) / 100);
          }
          return acc;
      }, { subtotal: 0, taxTotal: 0 });

      return { ...calculated, totalCost: calculated.subtotal + calculated.taxTotal };
  }, [watchedItems, inventory]);
  

  const onSubmit = async (data: PurchaseFormValues) => {
    const supplier = suppliers.find(s => s.id === data.supplierId);
    if (!supplier) return;
    
    const localDate = new Date(data.date + 'T00:00:00');

    const stockEntryItems: StockEntryItem[] = data.items.map(item => {
        const product = inventory.find(p => p.id === item.itemId);
        return {
            itemId: item.itemId,
            name: product?.name || 'N/A',
            quantity: item.quantity,
            unitCost: item.unitCost,
            taxRate: product?.taxRate || 0,
            hasTax: product?.hasTax || false,
        }
    });

    await addStockEntry({
        supplierId: data.supplierId,
        supplierName: supplier.name,
        invoiceNumber: data.invoiceNumber || '',
        date: localDate.toISOString(),
        totalCost: totalCost,
        items: stockEntryItems
    });

    toast({
      title: "Compra Registrada",
      description: `La compra ha sido registrada y el stock actualizado.`,
    });
    router.push("/purchases");
  };

  const onProductCreated = (product: InventoryItem) => {
      setLastCreatedProduct(product);
  };
  
  React.useEffect(() => {
    if (lastCreatedProduct) {
        append({ itemId: lastCreatedProduct.id, quantity: 1, unitCost: lastCreatedProduct.costPrice });
        form.trigger('items');
        setLastCreatedProduct(null);
    }
  }, [lastCreatedProduct, append, form]);
  
  const physicalInventory = React.useMemo(() => inventory.filter(i => !i.isService), [inventory]);
  
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Volver</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
          Registrar Nueva Compra (Manual)
        </h1>
        <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => router.push('/purchases')}>Cancelar</Button>
            <Button type="submit" form="purchase-new-form">Guardar Compra</Button>
        </div>
      </div>
      <form id="purchase-new-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardHeader>
            <CardTitle>Detalles de la Factura</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="supplierId">Proveedor</Label>
                    <Controller
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                <SelectValue placeholder="Seleccionar proveedor..." />
                                </SelectTrigger>
                                <SelectContent>
                                {suppliers.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {form.formState.errors.supplierId && <p className="text-sm text-destructive mt-2">{form.formState.errors.supplierId.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Número de Factura</Label>
                    <Input id="invoiceNumber" {...form.register("invoiceNumber")} placeholder="Ej. FAC-2024-123" />
                    {form.formState.errors.invoiceNumber && <p className="text-sm text-destructive">{form.formState.errors.invoiceNumber.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date">Fecha de Compra</Label>
                    <Input id="date" type="date" {...form.register("date")} />
                    {form.formState.errors.date && <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>}
                </div>
            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Items de la Compra</CardTitle>
            <CardDescription>Añade los productos incluidos en la factura.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/5">Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Costo Unit.</TableHead>
                  <TableHead>IVA</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const item = form.watch(`items.${index}`);
                  const product = inventory.find(p => p.id === item.itemId);
                  const itemSubtotal = (item.quantity || 0) * (item.unitCost || 0);
                  const itemTax = product?.hasTax ? itemSubtotal * ((product.taxRate || 0) / 100) : 0;
                  
                  return (
                  <TableRow key={field.id}>
                    <TableCell>
                       <Controller
                            control={form.control}
                            name={`items.${index}.itemId`}
                            render={({ field }) => (
                               <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar producto..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {physicalInventory.map(item => (
                                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                               </Select>
                            )}
                        />
                       {form.formState.errors.items?.[index]?.itemId && <p className="text-sm text-destructive mt-1">{form.formState.errors.items?.[index]?.itemId?.message}</p>}
                    </TableCell>
                    <TableCell>
                      <Input type="number" {...form.register(`items.${index}.quantity`)} placeholder="0" className="w-24"/>
                      {form.formState.errors.items?.[index]?.quantity && <p className="text-sm text-destructive mt-1">{form.formState.errors.items?.[index]?.quantity?.message}</p>}
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" {...form.register(`items.${index}.unitCost`)} placeholder="0.00" className="w-28" />
                      {form.formState.errors.items?.[index]?.unitCost && <p className="text-sm text-destructive mt-1">{form.formState.errors.items?.[index]?.unitCost?.message}</p>}
                    </TableCell>
                    <TableCell className="font-medium">${itemTax.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">${itemSubtotal.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
             {form.formState.errors.items && !form.formState.errors.items.root?.message && (
                 <div className="text-sm text-destructive mt-4 text-center">{form.formState.errors.items.message}</div>
             )}
             <div className="text-right mt-4">
                <NewProductDialog
                    open={isProductDialogOpen}
                    onOpenChange={setProductDialogOpen}
                    onProductCreated={onProductCreated}
                >
                    <Button type="button" variant="link" size="sm">
                        ¿No encuentras un producto? Créalo aquí.
                    </Button>
                </NewProductDialog>
             </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4">
              <div className="flex justify-end">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ itemId: "", quantity: 1, unitCost: 0 })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Item
                </Button>
              </div>
              <div className="flex flex-col items-end gap-2 text-sm ml-auto w-full max-w-xs">
                    <div className="flex justify-between w-full">
                        <span>Subtotal:</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full">
                        <span>IVA:</span>
                        <span>${taxTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full font-bold text-lg border-t pt-2 mt-2">
                        <span>Total:</span>
                        <span>${totalCost.toFixed(2)}</span>
                    </div>
                </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
