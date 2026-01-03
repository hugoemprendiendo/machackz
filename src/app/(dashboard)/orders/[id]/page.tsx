

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  PlusCircle,
  Save,
  Pencil,
  Printer,
  CheckCircle,
  Calendar as CalendarIcon,
  Trash2,
  Copy,
} from "lucide-react";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import { OrderStatus, InventoryItem, Client, Order, OrderPart } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OrderPrintLayout } from "@/components/orders/order-print-layout";
import { OrderReceptionLayout } from "@/components/orders/order-reception-layout";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const statusColors: Record<OrderStatus, string> = {
    'Abierta': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'En Progreso': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    'Esperando Piezas': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    'Listo para Entrega': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'Entregada / Cerrada': 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'Cancelada': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const allOrderStatuses: OrderStatus[] = [
    'Abierta',
    'En Progreso',
    'Esperando Piezas',
    'Listo para Entrega',
    'Entregada / Cerrada',
    'Cancelada'
];

function AddPartDialog({ orderId }: { orderId: string }) {
    const { addMultiplePartsToOrder, inventory } = useDataContext();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [isAdding, setIsAdding] = React.useState(false);

    const filteredInventory = React.useMemo(() => {
        if (!searchQuery) return [];
        const lowercasedQuery = searchQuery.toLowerCase();
        return inventory.filter(item =>
            item.name.toLowerCase().includes(lowercasedQuery) || 
            item.sku?.toLowerCase().includes(lowercasedQuery)
        );
    }, [inventory, searchQuery]);

    const handleSelectProduct = async (item: InventoryItem) => {
        setIsAdding(true);
        if (!item.isService && item.stock <= 0) {
            toast({
                variant: 'destructive',
                title: 'Sin Stock',
                description: `El producto ${item.name} no tiene stock disponible.`
            });
            setIsAdding(false);
            return;
        }

        try {
            await addMultiplePartsToOrder(orderId, [{ itemId: item.id, quantity: 1 }]);
            handleOpenChange(false);
        } catch (error) {
            // Error toast is handled in the context
            console.error("Error adding part to order:", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSearchQuery("");
        }
        setIsOpen(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Añadir Parte</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Añadir Parte a la Orden</DialogTitle>
                    <DialogDescription>Busca un producto por nombre o SKU para añadirlo a la orden.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <Input
                        placeholder="Buscar Producto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={isAdding}
                    />
                    <ScrollArea className="h-64 border rounded-md">
                        <div className="p-2">
                            {filteredInventory.length > 0 ? (
                                filteredInventory.map(item => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between items-center p-2 rounded-md cursor-pointer hover:bg-muted"
                                        onClick={() => !isAdding && handleSelectProduct(item)}
                                    >
                                        <div>
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.isService ? 'Servicio' : `Stock: ${item.stock}`}
                                            </div>
                                        </div>
                                        <div className="font-medium">${item.sellingPrice.toFixed(2)}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-center text-muted-foreground p-4">
                                    {searchQuery ? "No se encontraron productos." : "Comienza a escribir para buscar..."}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isAdding}>Cancelar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { orders, clients, settings, updateOrderStatus, updateOrderDetails, removePartFromOrder } = useDataContext();
  const { toast } = useToast();
  
  const printEntregaRef = React.useRef<HTMLDivElement>(null);
  const printRecepcionRef = React.useRef<HTMLDivElement>(null);

  const order = React.useMemo(() => orders.find((o) => o.id === params.id), [orders, params.id]);
  const client = React.useMemo(() => clients.find((c) => c.id === order?.customerId), [clients, order]);

  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [problemDescription, setProblemDescription] = React.useState(order?.problemDescription || '');
  const [diagnosis, setDiagnosis] = React.useState(order?.diagnosis || '');
  const [selectedStatus, setSelectedStatus] = React.useState<OrderStatus | undefined>(order?.status);
  const [closedAtDate, setClosedAtDate] = React.useState<Date | undefined>(
    order?.closedAt ? parseISO(order.closedAt) : undefined
  );
  const [partToRemove, setPartToRemove] = React.useState<OrderPart | null>(null);

  const handleRemovePart = (part: OrderPart) => {
    setPartToRemove(part);
  }

  const confirmRemovePart = async () => {
    if (order && partToRemove) {
        await removePartFromOrder(order.id, partToRemove);
        setPartToRemove(null);
    }
  }

  React.useEffect(() => {
    if (order) {
        setProblemDescription(order.problemDescription);
        setDiagnosis(order.diagnosis);
        setSelectedStatus(order.status);
        setClosedAtDate(order.closedAt ? parseISO(order.closedAt) : new Date());
    }
  }, [order]);

  React.useEffect(() => {
    if (selectedStatus === 'Entregada / Cerrada' && !order?.closedAt) {
      setClosedAtDate(new Date());
    }
  }, [selectedStatus, order?.closedAt]);
  
  const { partsSubtotal, taxTotal, total } = React.useMemo(() => {
    const subtotal = (order?.parts || []).reduce((sum, part) => sum + part.unitPrice * part.quantity, 0);
    const tax = (order?.parts || []).reduce((sum, part) => {
        const partTotal = part.unitPrice * part.quantity;
        const partTax = partTotal * (part.taxRate / 100);
        return sum + partTax;
    }, 0);
    return {
        partsSubtotal: subtotal,
        taxTotal: tax,
        total: subtotal + tax
    }
  }, [order?.parts]);

  const handlePrint = (contentRef: React.RefObject<HTMLDivElement>, title: string, styles?: string) => {
    const content = contentRef.current;
    if (content) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<html><head><title>${title}</title>`);
        printWindow.document.write('<script src="https://cdn.tailwindcss.com"><\/script>');
        printWindow.document.write(`<style>${styles || '@media print { body { -webkit-print-color-adjust: exact; } @page { margin: 0.5in; } }'}</style>`);
        printWindow.document.write('</head><body>');
        printWindow.document.write(content.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
      }
    }
  };

  const handlePrintEntrega = () => {
    handlePrint(printEntregaRef, `Orden de Servicio ${order?.id}`);
  };

  const handlePrintRecepcion = () => {
    const receptionStyles = `
      @media print {
        @page { size: auto; margin: 0.5in; }
        body { -webkit-print-color-adjust: exact; }
      }
      .print-container {
        display: flex;
        gap: 1rem;
      }
    `;
    handlePrint(printRecepcionRef, `Comprobante de Recepción ${order?.id}`, receptionStyles);
  };
  
  const handleDeliverAndPrint = () => {
    if(order?.id){
      updateOrderStatus(order.id, 'Entregada / Cerrada', new Date());
      toast({
          title: 'Orden Entregada',
          description: `La orden ${order.id} ha sido cerrada.`,
      });
      handlePrintEntrega();
    }
  }
  
  if (!order || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-4xl font-bold">Orden no encontrada</h1>
        <p className="text-muted-foreground">La orden que buscas no existe o ha sido eliminada.</p>
        <Button asChild className="mt-4">
          <Link href="/orders">Volver a Ordenes</Link>
        </Button>
      </div>
    );
  }
  
  const handleUpdateStatus = () => {
    if (selectedStatus) {
        let closingDate = selectedStatus === 'Entregada / Cerrada' ? closedAtDate : undefined;
        updateOrderStatus(order.id, selectedStatus, closingDate);
        toast({
            title: 'Orden Actualizada',
            description: `La orden ${order.id} ha sido actualizada al estado "${selectedStatus}".`
        });
    }
  };

  const handleSaveDetails = () => {
    updateOrderDetails(order.id, { problemDescription, diagnosis });
    toast({
        title: 'Detalles Guardados',
        description: 'La información de la orden ha sido actualizada.'
    });
    setIsEditingDetails(false);
  };
  
  return (
    <>
      <AlertDialog open={!!partToRemove} onOpenChange={(open) => !open && setPartToRemove(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar devolución?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción devolverá <strong>{partToRemove?.quantity} x {partToRemove?.name}</strong> al inventario. El costo de la parte (${partToRemove?.unitCost.toFixed(2)}) se reembolsará y se recalculará el total de la orden.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPartToRemove(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmRemovePart}>Confirmar Devolución</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/orders">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
            Orden {order.id}
          </h1>
          <Badge className={cn("text-xs font-medium", statusColors[order.status])} variant="outline">
            {order.status}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePrintRecepcion}>Imprimir Recepción</DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintEntrega}>Imprimir Entrega</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleDeliverAndPrint} disabled={order.status === 'Entregada / Cerrada'}><CheckCircle className="mr-2 h-4 w-4"/>Entregar e Imprimir</Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
          <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalles del Dispositivo</CardTitle>
                {isEditingDetails ? <Button size="sm" onClick={handleSaveDetails}><Save className="mr-2 h-4 w-4" />Guardar</Button> : <Button size="sm" variant="outline" onClick={() => setIsEditingDetails(true)}><Pencil className="mr-2 h-4 w-4" />Editar</Button>}
              </CardHeader>
              <CardContent className="grid gap-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div><span className="font-semibold">Tipo:</span> {order.deviceType}</div>
                    <div><span className="font-semibold">Marca:</span> {order.brand}</div>
                    <div><span className="font-semibold">Modelo:</span> {order.deviceModel}</div>
                    <div><span className="font-semibold">No. Serie:</span> {order.serialNumber || 'N/A'}</div>
                    <div><span className="font-semibold">RAM:</span> {order.ram || 'N/A'}</div>
                    <div><span className="font-semibold">Disco Duro:</span> {order.hdd || 'N/A'}</div>
                    <div><span className="font-semibold">Ciclos Batería:</span> {order.batteryCycles ?? 'N/A'}</div>
                    <div><span className="font-semibold">Serie Batería:</span> {order.batterySerial || 'N/A'}</div>
                    <div><span className="font-semibold">Tornillos:</span> {order.screws ?? 'N/A'}</div>
                    <div><span className="font-semibold">Cargador:</span> {order.hasCharger ? 'Si' : 'No'}</div>
                 </div>
                 <Separator />
                 <div className="grid gap-3"><div className="font-semibold">Condición del equipo</div><p className="text-sm text-muted-foreground">{order.condition || "No se especificó."}</p></div>
                 <Separator />
                <div className="grid gap-3"><div className="font-semibold">Problema Reportado (Falla / Servicio)</div>{isEditingDetails ? <Textarea value={problemDescription} onChange={(e) => setProblemDescription(e.target.value)} rows={4}/> : <p className="text-sm text-muted-foreground">{order.problemDescription}</p>}</div>
                 <Separator />
                 <div className="grid gap-3"><div className="font-semibold">Notas</div><p className="text-sm text-muted-foreground">{order.notes || "Sin notas."}</p></div>
                 <Separator />
                 <div className="grid gap-3"><div className="font-semibold">¿Faltan piezas internas?</div><p className="text-sm text-muted-foreground">{order.missingParts ? 'Si' : 'No'}</p></div>
                <Separator />
                <div className="grid gap-3"><div className="font-semibold">Diagnóstico Técnico</div>{isEditingDetails ? <Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={4}/> : <p className="text-sm text-muted-foreground">{order.diagnosis || "No se ha realizado un diagnóstico."}</p>}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Partes y Costos</CardTitle><AddPartDialog orderId={order.id} /></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[40%]">Producto</TableHead><TableHead>Costo</TableHead><TableHead>Cant.</TableHead><TableHead>Precio</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(order.parts || []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No se han añadido partes a esta orden.</TableCell></TableRow>
                    : (order.parts || []).map((part, index) => (
                      <TableRow key={`${part.lotId}-${index}`}>
                          <TableCell className="font-medium">{part.name} <span className="text-xs text-muted-foreground">(Lote: ...{part.lotId.slice(-4)})</span> {part.taxRate > 0 && <Badge variant="outline" className="ml-2">IVA {part.taxRate}%</Badge>} </TableCell>
                          <TableCell className="text-destructive">${part.unitCost.toFixed(2)}</TableCell>
                          <TableCell>{part.quantity}</TableCell>
                          <TableCell>${part.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${(part.unitPrice * part.quantity).toFixed(2)}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemovePart(part)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                     <TableRow><TableCell colSpan={5} className="font-semibold text-right">Subtotal Partes</TableCell><TableCell className="text-right font-semibold">${partsSubtotal.toFixed(2)}</TableCell></TableRow>
                      <TableRow><TableCell colSpan={5} className="font-semibold text-right">IVA</TableCell><TableCell className="text-right font-semibold">${taxTotal.toFixed(2)}</TableCell></TableRow>
                     <TableRow className="bg-muted/50"><TableCell colSpan={5} className="font-bold text-lg text-right">Total</TableCell><TableCell className="text-right font-bold text-lg">${total.toFixed(2)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>Acciones Adicionales</CardTitle></CardHeader><CardContent><Button variant="outline" className="w-full" asChild><Link href={{ pathname: '/orders/new', query: { customerId: order.customerId, deviceType: order.deviceType, brand: order.brand, deviceModel: order.deviceModel, serialNumber: order.serialNumber || '', ram: order.ram || '', hdd: order.hdd || '' } }}><Copy className="mr-2 h-4 w-4"/>Crear Nueva Orden con estos datos</Link></Button></CardContent></Card>
          </div>
          <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
            <Card><CardHeader><CardTitle>Información del Cliente</CardTitle></CardHeader><CardContent className="grid gap-4"><div className="flex items-center justify-between"><div className="font-semibold">{client.name}</div><Button variant="outline" size="sm" asChild><Link href={`/clients/${client.id}`}>Ver Perfil</Link></Button></div><div className="grid gap-1"><div className="font-semibold">Información de Contacto</div><address className="grid gap-0.5 not-italic text-muted-foreground"><span>{client.phone}</span><span>{client.email}</span></address></div><Separator /><div className="grid gap-1"><div className="font-semibold">Dirección</div><address className="grid gap-0.5 not-italic text-muted-foreground"><span>{client.address}</span></address></div></CardContent></Card>
            <Card>
                <CardHeader><CardTitle>Actualizar Estado</CardTitle></CardHeader>
                <CardContent className="grid gap-4">
                    <Select onValueChange={(value) => setSelectedStatus(value as OrderStatus)} value={selectedStatus}>
                        <SelectTrigger><SelectValue placeholder="Selecciona un estado" /></SelectTrigger>
                        <SelectContent>{allOrderStatuses.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent>
                    </Select>
                    {selectedStatus === 'Entregada / Cerrada' && (<div className="space-y-2"><Label>Fecha de Cierre</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !closedAtDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{closedAtDate ? format(closedAtDate, "PPP") : <span>Elige una fecha</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={closedAtDate} onSelect={setClosedAtDate} initialFocus /></PopoverContent></Popover></div>)}
                    <Button size="sm" className="w-full" onClick={handleUpdateStatus} disabled={order.status === selectedStatus && (selectedStatus !== 'Entregada / Cerrada' || (order.closedAt && closedAtDate && parseISO(order.closedAt).getTime() === closedAtDate.getTime()))}>Actualizar Estado</Button>
                </CardContent>
            </Card>
          </div>
        </div>
        <div style={{ display: 'none' }}><div ref={printEntregaRef}><OrderPrintLayout order={order} client={client} total={total} settings={settings} /></div><div ref={printRecepcionRef}><OrderReceptionLayout order={order} client={client} settings={settings} /></div></div>
      </div>
    </>
  );
}
