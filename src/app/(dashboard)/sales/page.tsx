

"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, File, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { cn } from "@/lib/utils";
import { useDataContext } from "@/context/data-context";
import { Sale, SaleStatus } from "@/lib/types";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, startOfToday, subDays, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<SaleStatus, string> = {
    'Borrador': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    'Completada': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'Cancelada': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};


const SalesTable = ({ sales }: { sales: Sale[] }) => {
    
    if (sales.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">
                No se encontraron ventas con los filtros aplicados.
            </div>
        )
    }

    return (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Venta ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {sales.map((sale) => (
                <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                        <Link href={`/sales/${sale.id}`} className="text-primary hover:underline">{sale.id}</Link>
                    </TableCell>
                    <TableCell>{sale.customerName}</TableCell>
                    <TableCell>{format(new Date(sale.createdAt), 'dd/MM/yyyy')}</TableCell>
                     <TableCell>
                        <Badge className={cn("text-xs font-medium", statusColors[sale.status])} variant="outline">
                            {sale.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">${sale.total.toFixed(2)}</TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
)};

export default function SalesPage() {
  const { sales } = useDataContext();
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);
  const [filterPreset, setFilterPreset] = React.useState<string>('all');

  const handlePresetChange = (preset: string) => {
    setFilterPreset(preset);
    const now = new Date();
    let from: Date | undefined = undefined;
    let to: Date | undefined = undefined;

    switch (preset) {
        case 'today':
            from = startOfToday();
            to = endOfDay(now);
            break;
        case 'last7':
            from = startOfDay(subDays(now, 6));
            to = endOfDay(now);
            break;
        case 'thisMonth':
            from = startOfMonth(now);
            to = endOfMonth(now);
            break;
        case 'lastMonth':
            const lastMonth = subMonths(now, 1);
            from = startOfMonth(lastMonth);
            to = endOfMonth(lastMonth);
            break;
        default:
            from = undefined;
            to = undefined;
    }
    setDate({ from, to });
  };
  
  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    if(newDate?.from && newDate?.to) {
      setFilterPreset('custom');
    } else if (!newDate) {
      setFilterPreset('all');
    }
  }

  const sortedSales = React.useMemo(() => [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [sales]);
  
  const filteredSales = React.useMemo(() => {
    if (!date?.from) {
      return sortedSales;
    }
    const from = startOfDay(date.from);
    const to = date.to ? endOfDay(date.to) : endOfDay(date.from);

    return sortedSales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= from && saleDate <= to;
    });
  }, [sortedSales, date]);


  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold tracking-tight">Ventas Directas</h1>
                <p className="text-muted-foreground">Visualiza y gestiona todas las ventas de mostrador.</p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1">
                <File className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Exportar</span>
                </Button>
                <Link href="/sales/new">
                <Button size="sm" className="h-8 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Nueva Venta</span>
                </Button>
                </Link>
            </div>
        </div>
      <Card>
          <CardHeader>
              <div className="flex items-center justify-between">
                  <div>
                      <CardTitle>Historial de Ventas</CardTitle>
                      <CardDescription>Aquí puedes ver todas las ventas directas.</CardDescription>
                  </div>
                   <div className="ml-auto flex items-center gap-2">
                     <Select value={filterPreset} onValueChange={handlePresetChange}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Filtrar por fecha" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todo</SelectItem>
                            <SelectItem value="today">Hoy</SelectItem>
                            <SelectItem value="last7">Últimos 7 días</SelectItem>
                            <SelectItem value="thisMonth">Este mes</SelectItem>
                            <SelectItem value="lastMonth">Mes pasado</SelectItem>
                            <SelectItem value="custom" disabled>Personalizado</SelectItem>
                        </SelectContent>
                    </Select>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[260px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                                ) : (
                                format(date.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Selecciona un rango</span>
                            )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={handleDateChange}
                            numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                      {date && (
                        <Button variant="ghost" size="icon" onClick={() => handleDateChange(undefined)}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                  </div>
              </div>
          </CardHeader>
          <CardContent>
              <SalesTable sales={filteredSales} />
          </CardContent>
      </Card>
    </div>
  );
}
