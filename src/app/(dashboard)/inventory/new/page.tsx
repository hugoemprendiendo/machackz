
"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

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

export default function NewInventoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { addInventoryItem } = useDataContext();

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
     defaultValues: {
      name: "",
      category: "",
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

  const isService = form.watch("isService");

  const onSubmit = (data: InventoryFormValues) => {
    addInventoryItem({
      ...data,
      sku: data.sku || '',
      taxRate: data.hasTax ? data.taxRate : 0,
      stock: data.isService ? 0 : data.stock,
      minStock: data.isService ? 0 : data.minStock,
    });
    toast({
      title: "Producto Creado",
      description: `El producto ${data.name} ha sido añadido al inventario.`,
    });
    router.push("/inventory");
  };

  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center gap-4">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Volver</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
          Añadir Nuevo Producto
        </h1>
        <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => router.push('/inventory')}>Cancelar</Button>
            <Button type="submit" form="inventory-new-form">Guardar Producto</Button>
        </div>
      </div>
      <form id="inventory-new-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Producto</CardTitle>
            <CardDescription>
              Completa la información del nuevo item de inventario.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
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
                <Label htmlFor="sku">SKU (Opcional)</Label>
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
                <Input id="stock" type="number" {...form.register("stock")} placeholder="0" disabled={isService} />
                 {form.formState.errors.stock && <p className="text-sm text-destructive">{form.formState.errors.stock.message}</p>}
              </div>
               <div className="space-y-2">
                <Label htmlFor="minStock">Stock Mínimo</Label>
                <Input id="minStock" type="number" {...form.register("minStock")} placeholder="0" disabled={isService} />
                 {form.formState.errors.minStock && <p className="text-sm text-destructive">{form.formState.errors.minStock.message}</p>}
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
  );
}
