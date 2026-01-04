
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  Printer,
  PlusCircle,
  Trash2,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDataContext } from "@/context/data-context";
import { SalePrintLayout } from "@/components/sales/sale-print-layout";
import { Sale, SaleStatus, Client, InventoryItem, OrderPart } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";

const statusColors: Record<SaleStatus, string> = {
    'Borrador': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    'Completada': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'Cancelada': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

function AddPartDialog({ saleId }: { saleId: string }) {
    const { inventory, addItemToSale } = useDataContext();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedItem, setSelectedItem] = React.useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = React.useState(1);
    const [isAdding, setIsAdding] = React.useState(false);

    const filteredInventory = React.useMemo(() => {
        if (!searchQuery) return [];
        const lowercasedQuery = searchQuery.toLowerCase();
        return inventory.filter(item =>
            item.name.toLowerCase().includes(lowercasedQuery) || 
            (item.sku && item.sku.toLowerCase().includes(lowercasedQuery))
        );
    }, [inventory, searchQuery]);

    const handleAddItem = async () => {
        if (!selectedItem) return;
        setIsAdding(true);
        
        try {
            await addItemToSale(saleId, selectedItem.id, quantity);
            handleOpenChange(false);
        } catch (error) {
            console.error("Error adding item to sale:", error);
            // Toast with error is handled inside addItemToSale
        } finally {
            setIsAdding(false);
        }
    };
    
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSearchQuery("");
            setSelectedItem(null);
            setQuantity(1);
        }
        setIsOpen(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Añadir Item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Añadir Item a la Venta</DialogTitle>
                    <DialogDescription>Busca un producto o servicio para añadirlo.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <Input
                        placeholder="Buscar Producto..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedItem(null);
                        }}
                        disabled={isAdding}
                    />
                    <ScrollArea className="h-64 border rounded-md">
                        <div className="p-2">
                            {filteredInventory.length > 0 ? (
                                filteredInventory.map(item => (
                                    <div
                                        key={item.id}
                                        className={cn("flex justify-between items-center p-2 rounded-md cursor-pointer hover:bg-muted", {
                                            "bg-muted": selectedItem?.id === item.id,
                                        })}
                                        onClick={() => setSelectedItem(item)}
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
                    {selectedItem && (
                        <div className="flex items-center gap-4 p-2 border rounded-lg bg-muted/50">
                             <div className="flex-1">
                                <Label htmlFor="quantity">Cantidad para <span className="font-semibold">{selectedItem.name}</span></Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="mt-1"
                                    min="1"
                                    max={selectedItem.isService ? undefined : selectedItem.stock}
                                />
                            </div>
                            <Button onClick={handleAddItem} disabled={isAdding || !selectedItem} className="mt-5">
                                {isAdding ? 'Añadiendo...' : 'Añadir'}
                            </Button>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isAdding}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { sales, clients, settings, removeItemFromSale, updateSaleStatus } = useDataContext();
  
  const printRef = React.useRef<HTMLDivElement>(null);
  const [partToRemove, setPartToRemove] = React.useState<OrderPart | null>(null);

  const sale = React.useMemo(() => sales.find((s) => s.id === params.id), [sales, params.id]);
  const client = React.useMemo(() => clients.find((c) => c.id === sale?.customerId), [clients, sale]);

  const handlePrint = () => {
    const content = printRef.current;
    if (content) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<html><head><title>Nota de Venta ${sale?.id}</title>`);
        printWindow.document.write('<script src="https://cdn.tailwindcss.com"><\/script>');
        printWindow.document.write(`<style>@media print { body { -webkit-print-color-adjust: exact; } @page { margin: 0.5in; } }</style>`);
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
  
  const handleRemovePart = (part: OrderPart) => {
    setPartToRemove(part);
  }
  
  const confirmRemovePart = async () => {
    if (sale && partToRemove) {
        await removeItemFromSale(sale.id, partToRemove);
        setPartToRemove(null);
    }
  }
  
  const handleCompleteSale = async () => {
    if (sale) {
      await updateSaleStatus(sale.id, 'Completada');
      toast({
        title: "Venta Finalizada",
        description: "La venta ha sido marcada como completada.",
      });
      handlePrint();
    }
  }
  
  if (!sale || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-4xl font-bold">Venta no encontrada</h1>
        <p className="text-muted-foreground">La venta que buscas no existe o ha sido eliminada.</p>
        <Button asChild className="mt-4">
          <Link href="/sales">Volver a Ventas</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <>
      <AlertDialog open={!!partToRemove} onOpenChange={(open) => !open && setPartToRemove(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar devolución?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción devolverá <strong>{partToRemove?.quantity} x {partToRemove?.name}</strong> al inventario.
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
            <Link href="/sales">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Link>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
            Venta {sale.id}
          </h1>
           <Badge className={cn("text-xs font-medium", statusColors[sale.status])} variant="outline">
            {sale.status}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/>Imprimir Nota</Button>
            {sale.status === 'Borrador' && (
              <Button onClick={handleCompleteSale}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Finalizar Venta
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
          <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Items de la Venta</CardTitle>
                {sale.status === 'Borrador' && <AddPartDialog saleId={sale.id} />}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Producto</TableHead>
                      <TableHead>Cant.</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {sale.status === 'Borrador' && <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sale.items || []).length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No hay productos en esta venta.</TableCell></TableRow>
                    : (sale.items || []).map((item, index) => (
                      <TableRow key={`${item.lotId}-${index}`}>
                          <TableCell className="font-medium">{item.name} {item.taxRate > 0 && <Badge variant="outline" className="ml-2">IVA {item.taxRate}%</Badge>} </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${(item.unitPrice * item.quantity).toFixed(2)}</TableCell>
                           {sale.status === 'Borrador' && (
                            <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => handleRemovePart(item)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                          )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex-col items-end gap-2">
                 <div className="flex justify-between w-full max-w-xs text-sm">
                    <span>Subtotal:</span>
                    <span>${sale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-full max-w-xs text-sm">
                    <span>IVA:</span>
                    <span>${sale.taxTotal.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between w-full max-w-xs font-bold text-lg border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span>${sale.total.toFixed(2)}</span>
                </div>
              </CardFooter>
            </Card>
          </div>
          <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
            <Card>
                <CardHeader><CardTitle>Información del Cliente</CardTitle></CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold">{client.name}</div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/clients/${client.id}`}>Ver Perfil</Link>
                        </Button>
                    </div>
                    <div className="grid gap-1">
                        <div className="font-semibold">Información de Contacto</div>
                        <address className="grid gap-0.5 not-italic text-muted-foreground">
                            <span>{client.phone}</span>
                            <span>{client.email}</span>
                        </address>
                    </div>
                    <Separator />
                    <div className="grid gap-1">
                        <div className="font-semibold">Dirección</div>
                        <address className="grid gap-0.5 not-italic text-muted-foreground">
                            <span>{client.address}</span>
                        </address>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>
        <div style={{ display: 'none' }}><div ref={printRef}><SalePrintLayout sale={sale} client={client} /></div></div>
      </div>
    </>
  );
}
