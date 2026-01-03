
"use client";

import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import React from "react";

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
import { SupplierCategory } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const supplierFormSchema = z.object({
  name: z.string().min(3, "El nombre de la empresa es requerido."),
  contactName: z.string().optional(),
  email: z.string().email("Por favor ingresa un email válido.").optional().or(z.literal('')),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  category: z.custom<SupplierCategory>(),
  marketplaceName: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { suppliers, updateSupplier } = useDataContext();

  const supplier = React.useMemo(() => suppliers.find((s) => s.id === params.id), [suppliers, params.id]);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
  });
  
  const category = form.watch("category");

  React.useEffect(() => {
    if (supplier) {
      form.reset({
        ...supplier,
        category: supplier.category || 'Proveedor Directo',
      });
    }
  }, [supplier, form]);

  const onSubmit = (data: SupplierFormValues) => {
    if (supplier) {
        updateSupplier({
        id: supplier.id,
        ...data,
        marketplaceName: data.category === 'Marketplace' ? data.marketplaceName : '',
      });
      toast({
        title: "Proveedor Actualizado",
        description: `La información del proveedor ha sido actualizada.`,
      });
      router.push("/suppliers");
    }
  };

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-4xl font-bold">Proveedor no encontrado</h1>
        <p className="text-muted-foreground">El proveedor que buscas no existe o ha sido eliminado.</p>
        <Button asChild className="mt-4">
          <Link href="/suppliers">Volver a Proveedores</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Volver</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
          Editar Proveedor
        </h1>
        <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => router.push('/suppliers')}>Cancelar</Button>
            <Button type="submit" form="supplier-edit-form">Guardar Cambios</Button>
        </div>
      </div>
      <form id="supplier-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Información del Proveedor</CardTitle>
            <CardDescription>
              Actualiza los datos del proveedor.
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

            {category === 'Proveedor Directo' ? (
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
            ) : (
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
