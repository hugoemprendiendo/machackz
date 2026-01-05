
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wand2, Loader2, ChevronLeft, PlusCircle } from "lucide-react";
import { format } from "date-fns";

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
import { generateDiagnosis } from "@/ai/flows/ai-diagnosis-for-orders";
import { useDataContext } from "@/context/data-context";
import { OrderReceptionLayout } from "@/components/orders/order-reception-layout";
import { Order, Client } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { Combobox } from "@/components/ui/combobox";

const orderFormSchema = z.object({
  customerId: z.string({ required_error: "Por favor selecciona un cliente." }).min(1, "Por favor selecciona un cliente."),
  createdAt: z.string(),
  deviceType: z.string().min(2, "El tipo de dispositivo es requerido."),
  brand: z.string().min(2, "La marca es requerida."),
  deviceModel: z.string().min(2, "El modelo del dispositivo es requerido."),
  serialNumber: z.string().optional(),
  hdd: z.string().optional(),
  ram: z.string().optional(),
  screws: z.coerce.number().optional(),
  batterySerial: z.string().optional(),
  batteryCycles: z.coerce.number().optional(),
  hasCharger: z.boolean().default(false),
  condition: z.string().optional(),
  problemDescription: z.string().min(10, "Describe el problema con más detalle."),
  missingParts: z.boolean().default(false),
  notes: z.string().optional(),
  diagnosis: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { clients, addOrder, settings } = useDataContext();
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [isClientDialogOpen, setClientDialogOpen] = React.useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerId: searchParams.get('customerId') || "",
      createdAt: format(new Date(), "yyyy-MM-dd"),
      deviceType: searchParams.get('deviceType') || "",
      brand: searchParams.get('brand') || "",
      deviceModel: searchParams.get('deviceModel') || "",
      serialNumber: searchParams.get('serialNumber') || "",
      ram: searchParams.get('ram') || "",
      hdd: searchParams.get('hdd') || "",
      problemDescription: "",
      diagnosis: "",
      hasCharger: false,
      missingParts: false,
    },
  });
  
  const printComponentRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = (order: Order, client: Client) => {
    const content = printComponentRef.current;
    if (content) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        
        const printableContent = `
          <html>
            <head>
              <title>Comprobante de Recepción ${order.id}</title>
              <script src="https://cdn.tailwindcss.com"><\/script>
              <style>
                @media print {
                  @page { size: auto; margin: 0.5in; }
                  body { -webkit-print-color-adjust: exact; }
                }
                 .print-container {
                    display: flex;
                    gap: 1rem;
                }
              </style>
            </head>
            <body>
              <div class="p-4 font-sans text-sm text-gray-900 bg-white">
                  <div class="print-container">
                      ${content.innerHTML}
                  </div>
              </div>
            </body>
          </html>
        `;

        printWindow.document.write(printableContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
      }
    }
  };


  const handleGenerateDiagnosis = async () => {
    const { deviceType, deviceModel, problemDescription } = form.getValues();
    if (!deviceType || !deviceModel || !problemDescription) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: "Por favor, completa el tipo, modelo y descripción del problema para usar la IA.",
      });
      return;
    }

    setIsAiLoading(true);
    try {
      const result = await generateDiagnosis({
        deviceType,
        deviceModel,
        problemDescription,
      });
      form.setValue("diagnosis", result.diagnosis);
      toast({
        title: "Diagnóstico por IA completado",
        description: "Se ha generado un diagnóstico inicial.",
      });
    } catch (error) {
      console.error("AI Diagnosis Error:", error);
      toast({
        variant: "destructive",
        title: "Error de IA",
        description: "No se pudo generar el diagnóstico. Inténtalo de nuevo.",
      });
    } finally {
      setIsAiLoading(false);
    }
  };
  
  const [orderToPrint, setOrderToPrint] = React.useState<Order | null>(null);
  const [clientToPrint, setClientToPrint] = React.useState<Client | null>(null);

  React.useEffect(() => {
    if (orderToPrint && clientToPrint) {
      handlePrint(orderToPrint, clientToPrint);
      setOrderToPrint(null);
      setClientToPrint(null);
    }
  }, [orderToPrint, clientToPrint]);

  const onClientCreated = (newClient: Client) => {
    form.setValue('customerId', newClient.id, { shouldValidate: true });
    setClientDialogOpen(false);
  };


  const onSubmit = async (data: OrderFormValues) => {
    const client = clients.find(c => c.id === data.customerId);
    if (!client) return;
    
    const localDate = new Date(data.createdAt + 'T00:00:00');

    const newOrderData = {
        customerId: data.customerId,
        customerName: client.name,
        createdAt: localDate.toISOString(),
        contactInfo: client.phone,
        deviceType: data.deviceType,
        brand: data.brand,
        deviceModel: data.deviceModel,
        serialNumber: data.serialNumber,
        hdd: data.hdd,
        ram: data.ram,
        screws: data.screws,
        batterySerial: data.batterySerial,
        batteryCycles: data.batteryCycles,
        hasCharger: data.hasCharger,
        condition: data.condition,
        problemDescription: data.problemDescription,
        missingParts: data.missingParts,
        notes: data.notes,
        diagnosis: data.diagnosis || 'Pendiente',
    };
    
    await addOrder(newOrderData);

    const tempOrderForPrint: Order = {
        ...newOrderData,
        id: 'ORD-TMP',
        status: 'Abierta',
        parts: [],
    };

    toast({
      title: "Orden Creada",
      description: `La orden para ${data.deviceModel} ha sido creada exitosamente.`,
    });
    
    setClientToPrint(client);
    setOrderToPrint(tempOrderForPrint);

    router.push("/orders");
  };
  
  const clientOptions = React.useMemo(() => clients.map(client => ({
      value: client.id,
      label: client.name,
  })), [clients]);

  const selectedClientId = form.watch('customerId');
  const selectedClient = React.useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Volver</span>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
                Crear Nueva Orden de Servicio
            </h1>
            <div className="flex items-center gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => router.push('/orders')}>Cancelar</Button>
                <Button type="submit" form="order-new-form">Crear Orden</Button>
            </div>
        </div>
        <form id="order-new-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
              <CardHeader>
              <CardTitle>Cliente y Fecha</CardTitle>
              <CardDescription>Selecciona el cliente y la fecha de creación.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
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
                     {selectedClient && (
                      <p className="text-sm text-muted-foreground mt-2">Teléfono: {selectedClient.phone}</p>
                    )}
                    {form.formState.errors.customerId && <p className="text-sm text-destructive mt-2">{form.formState.errors.customerId.message}</p>}
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
                   <div className="space-y-2">
                    <Label>Fecha de Creación</Label>
                     <Input id="createdAt" type="date" {...form.register("createdAt")} />
                     {form.formState.errors.createdAt && <p className="text-sm text-destructive mt-2">{form.formState.errors.createdAt.message}</p>}
                  </div>
              </CardContent>
          </Card>
          
          <Card>
              <CardHeader>
              <CardTitle>Información del equipo</CardTitle>
              <CardDescription>
                  Ingresa la información sobre el equipo y el problema reportado por el cliente.
              </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deviceType">Tipo de Dispositivo *</Label>
                    <Input id="deviceType" {...form.register("deviceType")} placeholder="Ej. Laptop, Celular" />
                    {form.formState.errors.deviceType && <p className="text-sm text-destructive">{form.formState.errors.deviceType.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marca *</Label>
                    <Input id="brand" {...form.register("brand")} placeholder="Ej. Apple, Dell, HP" />
                    {form.formState.errors.brand && <p className="text-sm text-destructive">{form.formState.errors.brand.message}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <Label htmlFor="deviceModel">Modelo</Label>
                    <Input id="deviceModel" {...form.register("deviceModel")} placeholder="Ej. MacBook Pro 15, iPhone 12" />
                     {form.formState.errors.deviceModel && <p className="text-sm text-destructive">{form.formState.errors.deviceModel.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Número de serie</Label>
                    <Input id="serialNumber" {...form.register("serialNumber")} />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ram">Memoria Ram</Label>
                    <Input id="ram" {...form.register("ram")} placeholder="Ej. 8GB DDR4" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hdd">Disco Duro</Label>
                    <Input id="hdd" {...form.register("hdd")} placeholder="Ej. 256GB SSD" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="batterySerial">Serie batería</Label>
                    <Input id="batterySerial" {...form.register("batterySerial")} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="batteryCycles">Ciclos de batería</Label>
                    <Input id="batteryCycles" type="number" {...form.register("batteryCycles")} />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                      <Label htmlFor="screws">Tornillos</Label>
                      <Input id="screws" type="number" {...form.register("screws")} />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                      <Controller
                          control={form.control}
                          name="hasCharger"
                          render={({ field }) => (
                              <Checkbox
                                  id="hasCharger"
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                              />
                          )}
                      />
                      <Label htmlFor="hasCharger">Cargador</Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="condition">Condición del equipo</Label>
                  <Textarea id="condition" {...form.register("condition")} placeholder="Describe la condición física del equipo..." rows={3} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="problemDescription">Falla / Servicio</Label>
                  <Textarea
                  id="problemDescription"
                  {...form.register("problemDescription")}
                  placeholder="Describe la falla reportada por el cliente..."
                  rows={4}
                  />
                  {form.formState.errors.problemDescription && <p className="text-sm text-destructive">{form.formState.errors.problemDescription.message}</p>}
              </div>

              <div className="flex items-center space-x-2">
                  <Controller
                      control={form.control}
                      name="missingParts"
                      render={({ field }) => (
                          <Checkbox
                              id="missingParts"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                          />
                      )}
                  />
                  <Label htmlFor="missingParts">¿Faltan piezas internas?</Label>
              </div>

              <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea id="notes" {...form.register("notes")} placeholder="Notas internas sobre la reparación..." rows={3} />
              </div>
              
              <div className="space-y-2">
                  <div className="flex items-center justify-between">
                  <Label htmlFor="diagnosis">Diagnóstico Técnico</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleGenerateDiagnosis} disabled={isAiLoading}>
                      {isAiLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      Diagnóstico por IA
                  </Button>
                  </div>
                  <Textarea
                  id="diagnosis"
                  {...form.register("diagnosis")}
                  placeholder="El diagnóstico técnico aparecerá aquí..."
                  rows={6}
                  />
              </div>
              </CardContent>
          </Card>
        </form>
      <div style={{ display: 'none' }}>
        {orderToPrint && clientToPrint && (
            <div ref={printComponentRef}>
                <OrderReceptionLayout order={orderToPrint} client={clientToPrint} settings={settings} />
            </div>
        )}
      </div>
    </div>
  );
}
