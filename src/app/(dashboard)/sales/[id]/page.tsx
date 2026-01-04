
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  Printer,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { sales, clients, settings } = useDataContext();
  
  const printRef = React.useRef<HTMLDivElement>(null);

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
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/>Imprimir Nota</Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
          <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
            <Card>
              <CardHeader><CardTitle>Items de la Venta</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[50%]">Producto</TableHead><TableHead>Cant.</TableHead><TableHead>Precio</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(sale.items || []).length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No hay productos en esta venta.</TableCell></TableRow>
                    : (sale.items || []).map((item, index) => (
                      <TableRow key={`${item.lotId}-${index}`}>
                          <TableCell className="font-medium">{item.name} {item.taxRate > 0 && <Badge variant="outline" className="ml-2">IVA {item.taxRate}%</Badge>} </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${(item.unitPrice * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                     <TableRow><TableCell colSpan={3} className="font-semibold text-right">Subtotal</TableCell><TableCell className="text-right font-semibold">${sale.subtotal.toFixed(2)}</TableCell></TableRow>
                      <TableRow><TableCell colSpan={3} className="font-semibold text-right">IVA</TableCell><TableCell className="text-right font-semibold">${sale.taxTotal.toFixed(2)}</TableCell></TableRow>
                     <TableRow className="bg-muted/50"><TableCell colSpan={3} className="font-bold text-lg text-right">Total</TableCell><TableCell className="text-right font-bold text-lg">${sale.total.toFixed(2)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
            <Card><CardHeader><CardTitle>Información del Cliente</CardTitle></CardHeader><CardContent className="grid gap-4"><div className="flex items-center justify-between"><div className="font-semibold">{client.name}</div><Button variant="outline" size="sm" asChild><Link href={`/clients/${client.id}`}>Ver Perfil</Link></Button></div><div className="grid gap-1"><div className="font-semibold">Información de Contacto</div><address className="grid gap-0.5 not-italic text-muted-foreground"><span>{client.phone}</span><span>{client.email}</span></address></div><Separator /><div className="grid gap-1"><div className="font-semibold">Dirección</div><address className="grid gap-0.5 not-italic text-muted-foreground"><span>{client.address}</span></address></div></CardContent></Card>
          </div>
        </div>
        <div style={{ display: 'none' }}><div ref={printRef}><SalePrintLayout sale={sale} client={client} /></div></div>
      </div>
    </>
  );
}
