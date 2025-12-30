
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDataContext } from "@/context/data-context";
import { Order, OrderStatus } from "@/lib/types";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, startOfToday, subDays, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const statusColors: Record<OrderStatus, string> = {
    'Abierta': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'En Progreso': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    'Esperando Piezas': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    'Listo para Entrega': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'Entregada / Cerrada': 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'Cancelada': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const OrdersTable = ({ orders }: { orders: Order[] }) => {
    
    if (orders.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">
                No se encontraron órdenes con los filtros aplicados.
            </div>
        )
    }

    return (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Orden ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead className="text-right">Fecha Cierre</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {orders.map((order) => (
                <TableRow key={order.id}>
                    <TableCell className="font-medium">
                        <Link href={`/orders/${order.id}`} className="text-primary hover:underline">{order.id}</Link>
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{order.deviceType}</TableCell>
                    <TableCell>
                        <Badge className={cn("text-xs font-medium", statusColors[order.status])} variant="outline">
                            {order.status}
                        </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(order.createdAt), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">{order.closedAt ? format(parseISO(order.closedAt), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
)};

export default function OrdersPage() {
  const { orders } = useDataContext();
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

  const sortedOrders = React.useMemo(() => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [orders]);
  
  const filteredOrders = React.useMemo(() => {
    if (!date?.from) {
      return sortedOrders;
    }
    const from = startOfDay(date.from);
    const to = date.to ? endOfDay(date.to) : endOfDay(date.from);

    return sortedOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= from && orderDate <= to;
    });
  }, [sortedOrders, date]);


  const activeOrders = React.useMemo(() => {
    return filteredOrders.filter(o => o.status === 'Abierta' || o.status === 'En Progreso' || o.status === 'Esperando Piezas' || o.status === 'Listo para Entrega');
  }, [filteredOrders]);
  
  const completedOrders = React.useMemo(() => {
    return filteredOrders.filter(o => o.status === 'Entregada / Cerrada' || o.status === 'Cancelada');
  }, [filteredOrders]);

  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold tracking-tight">Órdenes de Servicio</h1>
                <p className="text-muted-foreground">Visualiza y gestiona todas las reparaciones.</p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1">
                <File className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Exportar</span>
                </Button>
                <Link href="/orders/new">
                <Button size="sm" className="h-8 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Nueva Orden</span>
                </Button>
                </Link>
            </div>
        </div>
      <Tabs defaultValue="all">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">Todas ({filteredOrders.length})</TabsTrigger>
            <TabsTrigger value="active">Activas ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="completed">Completadas ({completedOrders.length})</TabsTrigger>
          </TabsList>
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
        <TabsContent value="all">
            <Card>
                <CardHeader>
                <CardTitle>Todas las Órdenes</CardTitle>
                <CardDescription>Aquí puedes ver todas las órdenes de servicio, sin importar su estado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <OrdersTable orders={filteredOrders} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="active">
            <Card>
                <CardHeader>
                <CardTitle>Órdenes Activas</CardTitle>
                <CardDescription>Órdenes que están actualmente en progreso o esperando acción.</CardDescription>
                </CardHeader>
                <CardContent>
                    <OrdersTable orders={activeOrders} />
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="completed">
            <Card>
                <CardHeader>
                <CardTitle>Órdenes Completadas</CardTitle>
                <CardDescription>Órdenes que han sido entregadas, cerradas o canceladas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <OrdersTable orders={completedOrders} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
