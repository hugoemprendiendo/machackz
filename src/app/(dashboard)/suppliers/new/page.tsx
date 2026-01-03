
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SupplierCategory } from "@/lib/types";

const supplierFormSchema = z.object({
  name: z.string().min(3, "El nombre de la empresa es requerido."),
  contactName: z.string().min(3, "El nombre del contacto es requerido.").optional().or(z.literal('')),
  email: z.string().email("Por favor ingresa un email válido.").optional().or(z.literal('')),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  category: z.custom<SupplierCategory>(),
  marketplaceName: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export default function NewSupplierPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { addSupplier } = useDataContext();

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      category: 'Proveedor Directo',
    }
  });

  const category = form.watch("category");

  const onSubmit = (data: SupplierFormValues) => {
    addSupplier({
      ...data,
      contactName: data.contactName || '',
      email: data.email || '',
      phone: data.phone || '',
      taxId: data.taxId || '',
      marketplaceName: data.category === 'Marketplace' ? data.marketplaceName : '',
    });
    toast({
      title: "Proveedor Creado",
      description: `El proveedor ${data.name} ha sido creado.`,
    });
    router.push("/suppliers");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Volver</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
          Crear Nuevo Proveedor
        </h1>
        <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => router.push('/suppliers')}>Cancelar</Button>
            <Button type="submit" form="supplier-new-form">Guardar Proveedor</Button>
        </div>
      </div>
      <form id="supplier-new-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Información del Proveedor</CardTitle>
            <CardDescription>
              Completa los datos para registrar un nuevo proveedor.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                  <Label htmlFor="category">Categoría de Proveedor</Label>
                  <Controller
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar categoría..." />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="Proveedor Directo">Proveedor Directo</SelectItem>
                                  <SelectItem value="Marketplace">Marketplace</SelectItem>
                              </SelectContent>
                          </Select>
                      )}
                  />
              </div>
              {category === 'Marketplace' ? (
                 <div className="space-y-2">
                    <Label htmlFor="marketplaceName">Nombre del Marketplace</Label>
                     <Controller
                        control={form.control}
                        name="marketplaceName"
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar marketplace..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Mercado Libre">Mercado Libre</SelectItem>
                                    <SelectItem value="Amazon">Amazon</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                 </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Empresa</Label>
                  <Input id="name" {...form.register("name")} placeholder="Ej. PC Componentes Global" />
                  {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                </div>
              )}
            </div>

            {category === 'Proveedor Directo' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Nombre del Contacto (Opcional)</Label>
                  <Input id="contactName" {...form.register("contactName")} placeholder="Ej. Ana Lopez" />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Opcional)</Label>
                    <Input id="email" type="email" {...form.register("email")} placeholder="Ej. ventas@pcglobal.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono (Opcional)</Label>
                    <Input id="phone" {...form.register("phone")} placeholder="Ej. 800-555-0101" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">ID Fiscal (RFC/VAT ID) (Opcional)</Label>
                  <Input id="taxId" {...form.register("taxId")} placeholder="Ej. PCG123456XYZ" />
                </div>
              </>
            )}

             {category === 'Marketplace' && (
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Vendedor (Opcional)</Label>
                    <Input id="name" {...form.register("name")} placeholder="Ej. Nombre del vendedor en el marketplace" />
                </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
