
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, PlusCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Client, InventoryItem } from "@/lib/types";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { Combobox } from "@/components/ui/combobox";
import { AddItemToSaleDialog } from "@/components/sales/add-item-to-sale-dialog";

const saleItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1."),
  unitPrice: z.coerce.number(),
  taxRate: z.coerce.number(),
});

const saleFormSchema = z.object({
  customerId: z.string().min(1, "Por favor selecciona un cliente."),
  items: z.array(saleItemSchema).min(1, "Debes añadir al menos un producto."),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { clients, addSale } = useDataContext();
  const [isClientDialogOpen, setClientDialogOpen] = React.useState(false);
  const [isItemDialogOpen, setItemDialogOpen] = React.useState(false);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerId: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const onClientCreated = (newClient: Client) => {
    form.setValue('customerId', newClient.id, { shouldValidate: true });
    setClientDialogOpen(false);
  };
  
  const onAddItem = (item: InventoryItem, quantity: number) => {
    append({
        itemId: item.id,
        name: item.name,
        quantity: quantity,
        unitPrice: item.sellingPrice,
        taxRate: item.taxRate,
    });
    setItemDialogOpen(false);
  };

  const clientOptions = React.useMemo(() => clients.map(client => ({
      value: client.id,
      label: client.name,
  })), [clients]);
  
  const watchedItems = form.watch("items");
  const { subtotal, taxTotal, total } = React.useMemo(() => {
    return watchedItems.reduce((acc, item) => {
        const itemSubtotal = item.unitPrice * item.quantity;
        const itemTax = itemSubtotal * (item.taxRate / 100);
        acc.subtotal += itemSubtotal;
        acc.taxTotal += itemTax;
        acc.total += itemSubtotal + itemTax;
        return acc;
    }, { subtotal: 0, taxTotal: 0, total: 0 });
  }, [watchedItems]);

  const onSubmit = async (data: SaleFormValues) => {
    const client = clients.find(c => c.id === data.customerId);
    if (!client) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cliente no encontrado.' });
        return;
    }
    
    try {
        await addSale({
            customerId: client.id,
            customerName: client.name,
            items: data.items,
        });
        toast({ title: "Venta Registrada", description: `La venta para ${client.name} ha sido creada.` });
        router.push("/sales");
    } catch(e: any) {
        // Error is already toasted in the context function
        console.error("Error creating sale:", e);
    }
  };

  return (
    <>
    <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Volver</span>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
                Crear Nueva Venta
            </h1>
            <div className="flex items-center gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => router.push('/sales')}>Cancelar</Button>
                <Button type="submit" form="sale-new-form">Guardar Venta</Button>
            </div>
        </div>
        <form id="sale-new-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-w-sm">
                        <Label>Cliente *</Label>
                        <Controller
                            control={form.control}
                            name="customerId"
                            render={({ field }) => (
                            <Combobox 
                                options={clientOptions}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Seleccionar cliente..."
                                searchPlaceholder="Buscar cliente..."
                                noResultsText="No se encontró el cliente."
                            />
                            )}
                        />
                        {form.formState.errors.customerId && <p className="text-sm text-destructive mt-2">{form.formState.errors.customerId.message}</p>}
                    </div>
                     <NewClientDialog
                        open={isClientDialogOpen}
                        onOpenChange={setClientDialogOpen}
                        onClientCreated={onClientCreated}
                    >
                        <Button type="button" variant="link" size="sm" className="p-0 h-auto mt-2">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Nuevo Cliente
                        </Button>
                    </NewClientDialog>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div className="space-y-1.5">
                        <CardTitle>Items de la Venta</CardTitle>
                        <CardDescription>Añade los productos y servicios a vender.</CardDescription>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setItemDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Añadir Item</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-2/5">Producto</TableHead>
                                <TableHead>Cant.</TableHead>
                                <TableHead>Precio Unit.</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                                <TableHead><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                        No hay productos añadidos a esta venta.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                fields.map((field, index) => {
                                    const itemSubtotal = watchedItems[index].unitPrice * watchedItems[index].quantity;
                                    return (
                                        <TableRow key={field.id}>
                                            <TableCell>{watchedItems[index].name}</TableCell>
                                            <TableCell>{watchedItems[index].quantity}</TableCell>
                                            <TableCell>${watchedItems[index].unitPrice.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${itemSubtotal.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                     {form.formState.errors.items && (
                        <div className="text-sm text-destructive mt-4 text-center">{form.formState.errors.items.message}</div>
                     )}
                </CardContent>
                {fields.length > 0 && (
                    <CardFooter className="flex-col items-end gap-2">
                        <div className="flex justify-between w-full max-w-xs text-sm">
                            <span>Subtotal:</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between w-full max-w-xs text-sm">
                            <span>IVA:</span>
                            <span>${taxTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between w-full max-w-xs font-bold text-lg border-t pt-2 mt-2">
                            <span>Total:</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </CardFooter>
                )}
            </Card>
        </form>
    </div>
    <AddItemToSaleDialog 
        open={isItemDialogOpen} 
        onOpenChange={setItemDialogOpen} 
        onAddItem={onAddItem}
    />
    </>
  );
}
