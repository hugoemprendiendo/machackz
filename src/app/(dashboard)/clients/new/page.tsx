
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cfdiUses } from "@/lib/data";

const clientFormSchema = z.object({
  name: z.string().min(2, "El nombre es requerido."),
  email: z.string().email("Por favor ingresa un email válido.").optional().or(z.literal('')),
  countryCode: z.string(),
  phone: z.string().min(8, "El teléfono debe tener al menos 8 dígitos."),
  address: z.string().optional(),
  taxId: z.string().optional(),
  cfdiUse: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

const countryCodes = ['+52', '+1', '+34', '+54', '+57', '+56'];
const clientSources = ['Recomendación', 'Facebook', 'Instagram', 'Google', 'Anuncio Local', 'Otro'];

export default function NewClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { addClient } = useDataContext();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      countryCode: "+52",
      phone: "",
      address: "",
      taxId: "",
      cfdiUse: "",
      source: "",
      notes: "",
    },
  });

  const onSubmit = async (data: ClientFormValues) => {
    await addClient({
      name: data.name,
      phone: `${data.countryCode} ${data.phone}`,
      email: data.email || '',
      address: data.address || '',
      taxId: data.taxId || '',
      cfdiUse: data.cfdiUse || '',
      source: data.source || '',
      notes: data.notes || '',
    });
    toast({
      title: "Cliente Creado",
      description: `El cliente ${data.name} ha sido creado exitosamente.`,
    });
    router.push("/clients");
  };

  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center gap-4">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Volver</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
          Crear Nuevo Cliente
        </h1>
        <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => router.push('/clients')}>Cancelar</Button>
            <Button type="submit" form="client-new-form">Guardar Cliente</Button>
        </div>
      </div>
      <form id="client-new-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
            <CardDescription>
              Completa los datos para registrar un nuevo cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input id="name" {...form.register("name")} placeholder="Ej. Juan Perez" />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="flex gap-2">
                    <Controller
                        control={form.control}
                        name="countryCode"
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="+52" />
                                </SelectTrigger>
                                <SelectContent>
                                {countryCodes.map(code => (
                                    <SelectItem key={code} value={code}>{code}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    <Input id="phone" {...form.register("phone")} placeholder="Ej. 55 1234 5678" className="flex-1"/>
                </div>
                {form.formState.errors.phone && <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                <Label htmlFor="email">Email (Opcional)</Label>
                <Input id="email" type="email" {...form.register("email")} placeholder="Ej. juan.perez@example.com" />
                {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="source">Fuente del Cliente</Label>
                     <Controller
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                <SelectValue placeholder="Seleccionar fuente..." />
                                </SelectTrigger>
                                <SelectContent>
                                {clientSources.map(source => (
                                    <SelectItem key={source} value={source}>{source}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección (Opcional)</Label>
              <Input id="address" {...form.register("address")} placeholder="Ej. Calle Falsa 123, Springfield" />
              {form.formState.errors.address && <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="taxId">RFC (Opcional)</Label>
                <Input id="taxId" {...form.register("taxId")} placeholder="Ej. PEEJ800101HMA" />
                {form.formState.errors.taxId && <p className="text-sm text-destructive">{form.formState.errors.taxId.message}</p>}
              </div>
              <div className="space-y-2">
                  <Label htmlFor="cfdiUse">Uso de CFDI (Opcional)</Label>
                    <Controller
                      control={form.control}
                      name="cfdiUse"
                      render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                              <SelectValue placeholder="Seleccionar uso de CFDI..." />
                              </SelectTrigger>
                              <SelectContent>
                              {cfdiUses.map(use => (
                                  <SelectItem key={use.code} value={use.code}>{use.code} - {use.description}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                      )}
                  />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Cualquier nota relevante sobre el cliente..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
