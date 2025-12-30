
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, PlusCircle, Trash2, Wand2, Loader2, UploadCloud } from "lucide-react";
import { format, parse } from "date-fns";

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
import { cn } from "@/lib/utils";
import { NewProductDialog } from "@/components/inventory/new-product-dialog";
import type { InventoryItem } from "@/lib/types";
import { extractInvoiceDetails } from "@/ai/flows/extract-invoice-details";

const purchaseItemSchema = z.object({
  itemId: z.string().min(1, "Selecciona un producto."),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1."),
  unitCost: z.coerce.number().min(0, "El costo debe ser positivo."),
});

const purchaseFormSchema = z.object({
  supplierId: z.string({ required_error: "Por favor selecciona un proveedor." }),
  invoiceNumber: z.string().min(3, "El número de factura es requerido."),
  date: z.string(),
  items: z.array(purchaseItemSchema).min(1, "Debes añadir al menos un producto."),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

function findClosestSupplier(name: string, suppliers: {id: string, name: string}[]) {
    if (!name || suppliers.length === 0) return null;
    const lowerCaseName = name.toLowerCase();
    // Simple match: check for inclusion
    const found = suppliers.find(s => s.name.toLowerCase().includes(lowerCaseName) || lowerCaseName.includes(s.name.toLowerCase()));
    return found ? found.id : null;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { suppliers, inventory, addStockEntry, updateInventoryStock } = useDataContext();
  const [isProductDialogOpen, setProductDialogOpen] = React.useState(false);
  const [lastCreatedProduct, setLastCreatedProduct] = React.useState<InventoryItem | null>(null);
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      items: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
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
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setInvoiceFile(event.target.files[0]);
    }
  };

  const handleAnalyzeInvoice = async () => {
    if (!invoiceFile) {
        toast({ variant: "destructive", title: "No hay archivo", description: "Por favor, selecciona un archivo de factura." });
        return;
    }
    setIsAiLoading(true);

    const reader = new FileReader();
    reader.readAsDataURL(invoiceFile);
    reader.onload = async () => {
        const dataUri = reader.result as string;
        try {
            const result = await extractInvoiceDetails({ invoiceImageDataUri: dataUri });
            
            form.setValue("invoiceNumber", result.invoiceNumber);
            
            const parsedDate = parse(result.date, 'yyyy-MM-dd', new Date());
            if (!isNaN(parsedDate.getTime())) {
                form.setValue("date", format(parsedDate, "yyyy-MM-dd"));
            }

            const supplierId = findClosestSupplier(result.supplierName, suppliers);
            if (supplierId) {
                form.setValue("supplierId", supplierId);
            } else {
                 toast({ variant: 'destructive', title: "Proveedor no encontrado", description: `No se pudo encontrar un proveedor que coincida con "${result.supplierName}". Por favor, selecciónalo manualmente.` });
            }

            const newItems = result.items.map(item => {
                const existingProduct = inventory.find(p => p.name.toLowerCase() === item.name.toLowerCase());
                return {
                    itemId: existingProduct?.id || "",
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                }
            });
            replace(newItems);
            
            toast({ title: "Factura Analizada", description: "El formulario ha sido rellenado con los datos de la factura." });

        } catch (error) {
            console.error("AI Invoice Analysis Error:", error);
            toast({ variant: "destructive", title: "Error de IA", description: "No se pudo analizar la factura. Inténtalo de nuevo." });
        } finally {
            setIsAiLoading(false);
        }
    };
    reader.onerror = () => {
        setIsAiLoading(false);
        toast({ variant: "destructive", title: "Error de Lectura", description: "No se pudo leer el archivo seleccionado." });
    }
  };


  const onSubmit = (data: PurchaseFormValues) => {
    const supplier = suppliers.find(s => s.id === data.supplierId);
    
    const newStockEntry = {
        supplierId: data.supplierId,
        supplierName: supplier?.name || 'N/A',
        invoiceNumber: data.invoiceNumber,
        date: new Date(data.date).toISOString(),
        totalCost: totalCost,
        items: data.items.map(item => {
            const product = inventory.find(p => p.id === item.itemId);
            if (product && !product.isService) {
                updateInventoryStock(item.itemId, product.stock + item.quantity);
            }
            return {
                itemId: item.itemId,
                name: product?.name || 'N/A',
                quantity: item.quantity,
                unitCost: item.unitCost,
                taxRate: product?.taxRate || 0,
                hasTax: product?.hasTax || false,
            }
        })
    };
    
    addStockEntry(newStockEntry);

    toast({
      title: "Compra Registrada",
      description: `La compra con factura ${data.invoiceNumber} ha sido registrada y el stock ha sido actualizado.`,
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
          Registrar Nueva Compra
        </h1>
        <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => router.push('/purchases')}>Cancelar</Button>
            <Button type="submit" form="purchase-new-form">Guardar Compra</Button>
        </div>
      </div>
       <Card>
        <CardHeader>
            <CardTitle>Análisis con IA</CardTitle>
            <CardDescription>Sube una imagen de tu factura y deja que la IA rellene los campos por ti.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6 items-center">
            <div 
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
            >
                <UploadCloud className="w-10 h-10 text-muted-foreground"/>
                <p className="mt-2 text-sm text-muted-foreground">
                    {invoiceFile ? `Archivo: ${invoiceFile.name}` : "Haz clic o arrastra para subir la factura"}
                </p>
                <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
            </div>
            <Button type="button" onClick={handleAnalyzeInvoice} disabled={isAiLoading || !invoiceFile}>
                {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                {isAiLoading ? 'Analizando...' : 'Analizar Factura'}
            </Button>
        </CardContent>
      </Card>
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
                  const itemTax = product?.hasTax ? itemSubtotal * (product.taxRate / 100) : 0;
                  
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
