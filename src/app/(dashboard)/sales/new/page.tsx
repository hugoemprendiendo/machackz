

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import { Client } from "@/lib/types";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { Combobox } from "@/components/ui/combobox";

const saleSchema = z.object({
  customerId: z.string().min(1, "Por favor selecciona un cliente."),
});

type SaleFormValues = z.infer<typeof saleSchema>;

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { clients, createDraftSale } = useDataContext();
  const [isClientDialogOpen, setClientDialogOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
  });

  const onClientCreated = (newClient: Client) => {
    form.setValue('customerId', newClient.id, { shouldValidate: true });
    setClientDialogOpen(false);
  };
  
  const clientOptions = React.useMemo(() => clients.map(client => ({
      value: client.id,
      label: client.name,
  })), [clients]);
  
  const selectedClientId = form.watch('customerId');
  const selectedClient = React.useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  React.useEffect(() => {
    if (selectedClientId) {
      const handleCreateDraft = async () => {
        setIsCreating(true);
        try {
          const newSale = await createDraftSale(selectedClientId);
          if (newSale) {
            toast({
              title: "Borrador de Venta Creado",
              description: `Iniciando venta para ${selectedClient?.name}.`,
            });
            router.replace(`/sales/${newSale.id}`);
          }
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo crear el borrador de la venta.",
          });
          setIsCreating(false);
        }
      };
      handleCreateDraft();
    }
  }, [selectedClientId, createDraftSale, router, toast, selectedClient?.name]);

  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Volver</span>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
                Iniciar Nueva Venta
            </h1>
        </div>
        <Card className="mx-auto w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Paso 1: Selecciona un Cliente</CardTitle>
                <CardDescription>Para comenzar, elige un cliente existente o crea uno nuevo.</CardDescription>
            </CardHeader>
            <CardContent>
                {isCreating ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p>Creando borrador de venta...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
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
                            {form.formState.errors.customerId && <p className="text-sm text-destructive mt-2">{form.formState.errors.customerId.message}</p>}
                        </div>
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
                )}
            </CardContent>
        </Card>
    </div>
  );
}
