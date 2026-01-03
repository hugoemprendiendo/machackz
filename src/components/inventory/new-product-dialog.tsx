
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import type { InventoryItem } from "@/lib/types";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";

const inventoryFormSchema = z.object({
  name: z.string().min(3, "El nombre del producto es requerido."),
  category: z.string().min(3, "La categoría es requerida."),
  sku: z.string().optional(),
  costPrice: z.coerce.number().min(0, "El costo debe ser un número positivo."),
  sellingPrice: z.coerce.number().min(0, "El precio de venta debe ser un número positivo."),
  stock: z.coerce.number().int("El stock debe ser un número entero.").min(0).default(0),
  minStock: z.coerce.number().int("El stock mínimo debe ser un número entero.").min(0).default(0),
  hasTax: z.boolean().default(true),
  taxRate: z.coerce.number().min(0, "El impuesto debe ser un número positivo.").default(16),
  isService: z.boolean().default(false),
});

type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

interface NewProductDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated: (product: InventoryItem) => void;
  initialValues?: Partial<InventoryFormValues>;
}

export function NewProductDialog({ children, open, onOpenChange, onProductCreated, initialValues }: NewProductDialogProps) {
  const { toast } = useToast();
  const { addInventoryItem } = useDataContext();

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      name: "",
      category: "General",
      sku: "",
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
      minStock: 0,
      hasTax: true,
      taxRate: 16,
      isService: false,
    },
  });
  
  React.useEffect(() => {
    if (initialValues) {
        form.reset({
            ...form.getValues(),
            ...initialValues,
        });
    }
  }, [initialValues, form, open]);

  const isService = form.watch("isService");

  const onSubmit = async (data: InventoryFormValues) => {
    const newProductData = {
        ...data,
        stock: data.isService ? 0 : data.stock,
        minStock: data.isService ? 0 : data.minStock,
        sku: data.sku || '',
        taxRate: data.hasTax ? data.taxRate : 0,
    };
    
    const newProduct = await addInventoryItem(newProductData);

    toast({
      title: "Producto Creado",
      description: `El producto ${data.name} ha sido añadido al inventario.`,
    });
    form.reset();
    onProductCreated({ ...newProductData, id: newProduct.id });
    onOpenChange(false);
  };
  
  // Reset form when dialog is closed without submitting
  React.useEffect(() => {
    if (!open) {
      form.reset({
        name: "",
        category: "General",
        sku: "",
        costPrice: 0,
        sellingPrice: 0,
        stock: 0,
        minStock: 0,
        hasTax: true,
        taxRate: 16,
        isService: false,
      });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Producto</DialogTitle>
          <DialogDescription>
            Completa los datos para registrar un nuevo producto en tu inventario.
          </DialogDescription>
        </DialogHeader>
        <form id="new-product-dialog-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
           <div className="space-y-2">
              <Label htmlFor="name">Nombre del Producto</Label>
              <Input id="name" {...form.register("name")} placeholder="Ej. SSD 1TB Kingston" />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input id="category" {...form.register("category")} placeholder="Ej. Almacenamiento" />
                {form.formState.errors.category && <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU (Código del producto)</Label>
                <Input id="sku" {...form.register("sku")} placeholder="Ej. KNG-SSD-1TB" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="costPrice">Precio de Costo</Label>
                <Input id="costPrice" type="number" step="0.01" {...form.register("costPrice")} placeholder="0.00" />
                {form.formState.errors.costPrice && <p className="text-sm text-destructive">{form.formState.errors.costPrice.message}</p>}
              </div>
               <div className="space-y-2">
                <Label htmlFor="sellingPrice">Precio de Venta</Label>
                <Input id="sellingPrice" type="number" step="0.01" {...form.register("sellingPrice")} placeholder="0.00" />
                {form.formState.errors.sellingPrice && <p className="text-sm text-destructive">{form.formState.errors.sellingPrice.message}</p>}
              </div>
            </div>
             <div className="flex items-center space-x-2 pt-2">
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
            {!isService && (
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="stock">Stock Actual</Label>
                        <Input id="stock" type="number" {...form.register("stock")} placeholder="0" />
                        {form.formState.errors.stock && <p className="text-sm text-destructive">{form.formState.errors.stock.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="minStock">Stock Mínimo</Label>
                        <Input id="minStock" type="number" {...form.register("minStock")} placeholder="0" />
                        {form.formState.errors.minStock && <p className="text-sm text-destructive">{form.formState.errors.minStock.message}</p>}
                    </div>
                </div>
            )}
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
        </form>
         <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" form="new-product-dialog-form">Guardar Producto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
