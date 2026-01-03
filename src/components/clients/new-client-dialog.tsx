

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import { Client } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
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

interface NewClientDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client: Client) => void;
}

const countryCodes = ['+52', '+1', '+34', '+54', '+57', '+56'];
const clientSources = ['Recomendación', 'Facebook', 'Instagram', 'Google', 'Anuncio Local', 'Otro'];

export function NewClientDialog({ children, open, onOpenChange, onClientCreated }: NewClientDialogProps) {
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
    
    const newClientData = {
      name: data.name,
      phone: `${data.countryCode} ${data.phone}`,
      email: data.email || '',
      address: data.address || '',
      taxId: data.taxId || '',
      cfdiUse: data.cfdiUse || '',
      source: data.source || '',
      notes: data.notes || '',
    };

    const newClient = await addClient(newClientData);

    toast({
      title: "Cliente Creado",
      description: `El cliente ${data.name} ha sido creado exitosamente.`,
    });
    form.reset();
    onClientCreated({ ...newClientData, id: newClient.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Completa los datos para registrar un nuevo cliente. No saldrás de la página de órdenes.
          </DialogDescription>
        </DialogHeader>
        <form id="new-client-dialog-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
          <div className="space-y-2">
            <Label htmlFor="address">Dirección (Opcional)</Label>
            <Input id="address" {...form.register("address")} placeholder="Ej. Calle Falsa 123, Springfield" />
            {form.formState.errors.address && <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxId">RFC (Opcional)</Label>
              <Input id="taxId" {...form.register("taxId")} placeholder="Ej. PEEJ800101HMA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfdiUse">Uso de CFDI</Label>
              <Controller
                control={form.control}
                name="cfdiUse"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cfdiUses.map((use) => (
                        <SelectItem key={use.code} value={use.code}>
                          {use.code}
                        </SelectItem>
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
        </form>
         <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" form="new-client-dialog-form">Guardar Cliente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
