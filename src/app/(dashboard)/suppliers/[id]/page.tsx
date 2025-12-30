"use client";

import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
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

const supplierFormSchema = z.object({
  name: z.string().min(3, "El nombre de la empresa es requerido."),
  contactName: z.string().min(3, "El nombre del contacto es requerido."),
  email: z.string().email("Por favor ingresa un email válido."),
  phone: z.string().min(8, "El teléfono es requerido."),
  taxId: z.string().min(10, "El ID Fiscal es requerido."),
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
    defaultValues: supplier,
  });

  React.useEffect(() => {
    if (supplier) {
      form.reset(supplier);
    }
  }, [supplier, form]);

  const onSubmit = (data: SupplierFormValues) => {
    if (supplier) {
        updateSupplier({
        id: supplier.id,
        ...data
      });
      toast({
        title: "Proveedor Actualizado",
        description: `La información del proveedor ${data.name} ha sido actualizada.`,
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
             <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Empresa</Label>
                <Input id="name" {...form.register("name")} placeholder="Ej. PC Componentes Global" />
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Nombre del Contacto</Label>
                <Input id="contactName" {...form.register("contactName")} placeholder="Ej. Ana Lopez" />
                {form.formState.errors.contactName && <p className="text-sm text-destructive">{form.formState.errors.contactName.message}</p>}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} placeholder="Ej. ventas@pcglobal.com" />
                {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" {...form.register("phone")} placeholder="Ej. 800-555-0101" />
                {form.formState.errors.phone && <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">ID Fiscal (RFC/VAT ID)</Label>
              <Input id="taxId" {...form.register("taxId")} placeholder="Ej. PCG123456XYZ" />
              {form.formState.errors.taxId && <p className="text-sm text-destructive">{form.formState.errors.taxId.message}</p>}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
