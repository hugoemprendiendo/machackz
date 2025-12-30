
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import { SeedDatabaseCard } from "@/components/settings/seed-database-card";
import { AccountSettings } from "@/components/settings/account-settings";

const settingsFormSchema = z.object({
  receptionNotes: z.string().min(10, "Las notas de recepción son requeridas."),
  deliveryNotes: z.string().min(10, "Las notas de entrega son requeridas."),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { settings, updateSettings } = useDataContext();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: settings,
  });

  React.useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);


  const onSubmit = (data: SettingsFormValues) => {
    updateSettings(data);
    toast({
      title: "Configuración Guardada",
      description: "Tus cambios han sido guardados exitosamente.",
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">Gestiona la configuración de la aplicación.</p>
        </div>
        <Button type="submit" form="settings-form">
            <Save className="mr-2 h-4 w-4" />
            Guardar Cambios
        </Button>
      </div>

      <div className="grid gap-8">
        <AccountSettings />

        <form id="settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Textos de Impresión</CardTitle>
              <CardDescription>
                Personaliza los términos y condiciones que aparecen en los documentos impresos.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="receptionNotes">Notas de Comprobante de Recepción</Label>
                <Textarea
                  id="receptionNotes"
                  {...form.register("receptionNotes")}
                  placeholder="Escribe aquí los términos para la recepción de equipos..."
                  rows={5}
                />
                {form.formState.errors.receptionNotes && <p className="text-sm text-destructive">{form.formState.errors.receptionNotes.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryNotes">Notas de Orden de Entrega</Label>
                <Textarea
                  id="deliveryNotes"
                  {...form.register("deliveryNotes")}
                  placeholder="Escribe aquí los términos para la entrega de equipos reparados..."
                  rows={5}
                />
                 {form.formState.errors.deliveryNotes && <p className="text-sm text-destructive">{form.formState.errors.deliveryNotes.message}</p>}
              </div>
            </CardContent>
          </Card>
        </form>

        <SeedDatabaseCard />
      </div>
    </div>
  );
}
