
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, PlusCircle, Calendar as CalendarIcon, Trash2, Save, Printer } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import { Client, InventoryItem, Sale } from "@/lib/types";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalePrintLayout } from "@/components/sales/sale-print-layout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const saleItemSchema = z.object({
  itemId: z.string().min(1, "Selecciona un producto."),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1."),
});

const saleFormSchema = z.object({
  customerId: z.string({ required_error: "Por favor selecciona un cliente." }).min(1, "Por favor selecciona un cliente."),
  createdAt: z.date(),
  notes: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "Debes añadir al menos un producto."),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

function AddItemDialog({ onAddItem }: { onAddItem: (itemId: string, quantity: number) => void }) {
    const { inventory } = useDataContext();
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedItem, setSelectedItem] = React.useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = React.useState(1);

    const filteredInventory = React.useMemo(() => {
        if (!searchQuery) return [];
        const lowercasedQuery = searchQuery.toLowerCase();
        return inventory.filter(item =>
            item.name.toLowerCase().includes(lowercasedQuery) || 
            item.sku?.toLowerCase().includes(lowercasedQuery)
        );
    }, [inventory, searchQuery]);

    const handleAddItem = () => {
        if (!selectedItem) return;
        onAddItem(selectedItem.id, quantity);
        handleOpenChange(false);
    };
    
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSearchQuery("");
            setSelectedItem(null);
            setQuantity(1);
        }
        setIsOpen(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Añadir Item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Añadir Item a la Venta</DialogTitle>
                    <DialogDescription>Busca un producto o servicio para añadirlo.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <Input
                        placeholder="Buscar Producto..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedItem(null);
                        }}
                    />
                    <ScrollArea className="h-64 border rounded-md">
                        <div className="p-2">
                            {filteredInventory.length > 0 ? (
                                filteredInventory.map(item => (
                                    <div
                                        key={item.id}
                                        className={cn("flex justify-between items-center p-2 rounded-md cursor-pointer hover:bg-muted", {
                                            "bg-muted": selectedItem?.id === item.id,
                                        })}
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        <div>
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.isService ? 'Servicio' : `Stock: ${item.stock}`}
                                            </div>
                                        </div>
                                        <div className="font-medium">${item.sellingPrice.toFixed(2)}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-center text-muted-foreground p-4">
                                    {searchQuery ? "No se encontraron productos." : "Comienza a escribir para buscar..."}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    {selectedItem && (
                        <div className="flex items-center gap-4 p-2 border rounded-lg bg-muted/50">
                             <div className="flex-1">
                                <Label htmlFor="quantity">Cantidad para <span className="font-semibold">{selectedItem.name}</span></Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="mt-1"
                                    min="1"
                                    max={selectedItem.isService ? undefined : selectedItem.stock}
                                />
                            </div>
                            <Button onClick={handleAddItem} className="mt-5">Añadir</Button>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { clients, inventory, addSale } = useDataContext();
  const [isClientDialogOpen, setClientDialogOpen] = React.useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);
  
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      createdAt: new Date(),
      items: [],
      notes: "",
    },
  });
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const onClientCreated = (newClient: Client) => {
    form.setValue('customerId', newClient.id, { shouldValidate: true });
    setClientDialogOpen(false);
  };
  
  const watchedItems = form.watch("items");
  const { subtotal, taxTotal, total } = React.useMemo(() => {
    return (watchedItems || []).reduce((acc, item) => {
        const product = inventory.find(p => p.id === item.itemId);
        if (!product) return acc;
        
        const itemSubtotal = product.sellingPrice * item.quantity;
        const itemTax = itemSubtotal * (product.taxRate / 100);
        
        acc.subtotal += itemSubtotal;
        acc.taxTotal += itemTax;
        acc.total += itemSubtotal + itemTax;
        
        return acc;
    }, { subtotal: 0, taxTotal: 0, total: 0 });
  }, [watchedItems, inventory]);


  const onSubmit = async (data: SaleFormValues) => {
    const client = clients.find(c => c.id === data.customerId);
    if (!client) return;

    await addSale({
      customerId: data.customerId,
      customerName: client.name,
      createdAt: data.createdAt.toISOString(),
      notes: data.notes,
      items: data.items.map(item => {
        const product = inventory.find(p => p.id === item.itemId)!;
        return {
            itemId: product.id,
            name: product.name,
            quantity: item.quantity,
            unitPrice: product.sellingPrice,
            unitCost: product.costPrice,
            taxRate: product.taxRate,
            lotId: 'SALE', // For direct sales, we can use a generic marker
        }
      })
    });

    toast({
      title: "Venta Creada",
      description: `La venta para ${client.name} ha sido creada exitosamente.`,
    });
    
    router.push("/sales");
  };
  
  const clientOptions = React.useMemo(() => clients.map(client => ({
      value: client.id,
      label: client.name,
  })), [clients]);

  const selectedClientId = form.watch('customerId');
  const selectedClient = React.useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);
  
  const handleAddItem = (itemId: string, quantity: number) => {
    const product = inventory.find(p => p.id === itemId);
    if (!product) return;

    if (!product.isService && product.stock < quantity) {
        toast({
            variant: 'destructive',
            title: 'Sin Stock',
            description: `No hay suficiente stock para ${product.name}. Necesitas ${quantity} pero solo hay ${product.stock}.`
        });
        return;
    }

    const existingItemIndex = fields.findIndex(field => field.itemId === itemId);
    if (existingItemIndex > -1) {
        const existingItem = fields[existingItemIndex];
        update(existingItemIndex, { ...existingItem, quantity: existingItem.quantity + quantity });
    } else {
        append({ itemId, quantity });
    }
  };
  
  return (
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
              <CardTitle>Cliente y Fecha</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
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
                     {selectedClient && (
                      <p className="text-sm text-muted-foreground mt-2">Teléfono: {selectedClient.phone}</p>
                    )}
                    {form.formState.errors.customerId && <p className="text-sm text-destructive mt-2">{form.formState.errors.customerId.message}</p>}
                    <NewClientDialog
                        open={isClientDialogOpen}
                        onOpenChange={setClientDialogOpen}
                        onClientCreated={onClientCreated}
                    >
                        <Button type="button" variant="link" size="sm" className="p-0 h-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Nuevo Cliente
                        </Button>
                    </NewClientDialog>
                  </div>
                   <div className="space-y-2">
                    <Label>Fecha de Creación</Label>
                     <Controller
                        control={form.control}
                        name="createdAt"
                        render={({ field }) => (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Elige una fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    />
                     {form.formState.errors.createdAt && <p className="text-sm text-destructive mt-2">{form.formState.errors.createdAt.message}</p>}
                  </div>
              </CardContent>
          </Card>
          
          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Items de la Venta</CardTitle>
                  <CardDescription>Añade los productos y servicios a vender.</CardDescription>
                </div>
                <AddItemDialog onAddItem={handleAddItem} />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Producto/Servicio</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Aún no has añadido items.
                        </TableCell>
                      </TableRow>
                    ) : (
                      fields.map((field, index) => {
                        const product = inventory.find(p => p.id === field.itemId);
                        if (!product) return null;
                        const itemTotal = product.sellingPrice * field.quantity;
                        return (
                          <TableRow key={field.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>${product.sellingPrice.toFixed(2)}</TableCell>
                            <TableCell>
                                <Input 
                                    type="number" 
                                    min="1"
                                    max={product.isService ? undefined : product.stock}
                                    {...form.register(`items.${index}.quantity`)}
                                    className="w-20"
                                />
                            </TableCell>
                            <TableCell className="text-right">${itemTotal.toFixed(2)}</TableCell>
                            <TableCell>
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                {form.formState.errors.items && <p className="text-sm text-center text-destructive mt-4">{form.formState.errors.items.message}</p>}
              </CardContent>
               <CardFooter className="flex flex-col items-end gap-2">
                <div className="w-full max-w-xs space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>IVA:</span>
                        <span>${taxTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t mt-2 pt-2">
                        <span>Total:</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                </div>
              </CardFooter>
          </Card>
        </form>
    </div>
  );
}
