
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import { Client, OrderPart } from "@/lib/types";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddItemToSaleDialog } from "@/components/sales/add-item-to-sale-dialog";
import { Badge } from "@/components/ui/badge";

const saleItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  unitCost: z.number(),
  taxRate: z.number(),
  lotId: z.string(),
});

const saleFormSchema = z.object({
  customerId: z.string().min(1, "Por favor selecciona un cliente."),
  items: z.array(saleItemSchema).min(1, "Debes añadir al menos un producto a la venta."),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { clients, addSale, inventory } = useDataContext();
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
    form.setValue("customerId", newClient.id, { shouldValidate: true });
    setClientDialogOpen(false);
  };
  
  const onAddItem = (item: Omit<OrderPart, 'name'> & { name: string }) => {
    append(item);
  };

  const clientOptions = React.useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: client.name,
      })),
    [clients]
  );
  
  const watchedItems = form.watch("items");
  const { subtotal, taxTotal, total } = React.useMemo(() => {
    return watchedItems.reduce(
      (acc, item) => {
        const itemSubtotal = item.unitPrice * item.quantity;
        const itemTax = itemSubtotal * (item.taxRate / 100);
        acc.subtotal += itemSubtotal;
        acc.taxTotal += itemTax;
        acc.total += itemSubtotal + itemTax;
        return acc;
      },
      { subtotal: 0, taxTotal: 0, total: 0 }
    );
  }, [watchedItems]);

  const onSubmit = async (data: SaleFormValues) => {
    const customer = clients.find(c => c.id === data.customerId);
    if (!customer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cliente no encontrado.'});
        return;
    }

    try {
      await addSale({
        customerId: data.customerId,
        customerName: customer.name,
        items: data.items,
        notes: ''
      });
      router.push("/sales");
    } catch (e) {
      // The context handles the toast for errors.
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <form id="sale-new-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
            Crear Nueva Venta
          </h1>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/sales")}
            >
              Cancelar
            </Button>
            <Button type="submit">Guardar Venta</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Items de la Venta</CardTitle>
                <CardDescription>
                  Añade los productos y servicios que se venderán.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-[100px]">Cantidad</TableHead>
                      <TableHead className="w-[120px]">Precio Unit.</TableHead>
                      <TableHead className="w-[120px] text-right">
                        Subtotal
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length > 0 ? (
                      fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">
                            {field.name}
                            {field.taxRate > 0 && <Badge variant="outline" className="ml-2">IVA {field.taxRate}%</Badge>}
                          </TableCell>
                          <TableCell>{field.quantity}</TableCell>
                          <TableCell>${field.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            ${(field.quantity * field.unitPrice).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Aún no hay productos en esta venta.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                 {form.formState.errors.items && (
                    <p className="text-sm text-destructive mt-4 text-center">{form.formState.errors.items.message}</p>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <AddItemToSaleDialog open={isItemDialogOpen} onOpenChange={setItemDialogOpen} onAddItem={onAddItem}>
                  <Button type="button" variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Item
                  </Button>
                </AddItemToSaleDialog>
                
                 <div className="flex flex-col items-end gap-2 text-sm w-full max-w-xs">
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
                        <span>${total.toFixed(2)}</span>
                    </div>
                </div>
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Selecciona un Cliente *</Label>
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
                  {form.formState.errors.customerId && (
                    <p className="text-sm text-destructive mt-2">
                      {form.formState.errors.customerId.message}
                    </p>
                  )}
                </div>
                <NewClientDialog
                  open={isClientDialogOpen}
                  onOpenChange={setClientDialogOpen}
                  onClientCreated={onClientCreated}
                >
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="p-0 h-auto mt-2"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Nuevo Cliente
                  </Button>
                </NewClientDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

    