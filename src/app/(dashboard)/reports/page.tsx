
"use client";

import * as React from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Pie, PieChart, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useDataContext } from "@/context/data-context";
import { OrderStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Wand2, X } from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, startOfToday, subDays, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderDetailsDialog } from "@/components/reports/order-details-dialog";
import { Input } from "@/components/ui/input";

const COLORS = {
  'Abierta': 'hsl(var(--chart-1))',
  'En Progreso': 'hsl(var(--chart-2))',
  'Esperando Piezas': 'hsl(var(--chart-3))',
  'Listo para Entrega': 'hsl(var(--chart-4))',
  'Entregada / Cerrada': 'hsl(var(--muted))',
  'Cancelada': 'hsl(var(--destructive))',
};

const orderStatusChartConfig = {
  orders: {
    label: "Órdenes",
  },
  'Abierta': { label: 'Abierta', color: COLORS['Abierta'] },
  'En Progreso': { label: 'En Progreso', color: COLORS['En Progreso'] },
  'Esperando Piezas': { label: 'Esperando Piezas', color: COLORS['Esperando Piezas'] },
  'Listo para Entrega': { label: 'Listo para Entrega', color: COLORS['Listo para Entrega'] },
  'Entregada / Cerrada': { label: 'Cerrada', color: COLORS['Entregada / Cerrada'] },
  'Cancelada': { label: 'Cancelada', color: COLORS['Cancelada'] },
} satisfies ChartConfig;

export default function ReportsPage() {
  const { orders, inventory, clients } = useDataContext();
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [filterPreset, setFilterPreset] = React.useState<string>('all');
  
  const handlePresetChange = (preset: string) => {
    setFilterPreset(preset);
    const now = new Date();
    let from = '';
    let to = '';

    switch (preset) {
        case 'today':
            from = format(now, 'yyyy-MM-dd');
            to = format(now, 'yyyy-MM-dd');
            break;
        case 'last7':
            from = format(subDays(now, 6), 'yyyy-MM-dd');
            to = format(now, 'yyyy-MM-dd');
            break;
        case 'thisMonth':
            from = format(startOfMonth(now), 'yyyy-MM-dd');
            to = format(endOfMonth(now), 'yyyy-MM-dd');
            break;
        case 'lastMonth':
            const lastMonth = subMonths(now, 1);
            from = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
            to = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
            break;
        default:
            from = '';
            to = '';
    }
    setDateFrom(from);
    setDateTo(to);
  };

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
    setFilterPreset('all');
  }
  
  const completedOrders = React.useMemo(() => {
    return orders.filter(o => {
        if (o.status !== 'Entregada / Cerrada') return false;
        if (!dateFrom) return true;
        
        const from = startOfDay(new Date(dateFrom + 'T00:00:00'));
        const toDate = dateTo || dateFrom;
        const to = endOfDay(new Date(toDate + 'T00:00:00'));

        const closedDate = o.closedAt ? parseISO(o.closedAt) : parseISO(o.createdAt);
        return closedDate >= from && closedDate <= to;
    });
  }, [orders, dateFrom, dateTo]);


  const reportData = React.useMemo(() => {
    return completedOrders.map(order => {
      const partsCost = order.parts.reduce((sum, part) => sum + part.unitCost * part.quantity, 0);
      const partsPrice = order.parts.reduce((sum, part) => {
        const sub = part.unitPrice * part.quantity;
        return sum + sub + (sub * (part.taxRate/100));
      }, 0);
      const profit = partsPrice - partsCost;

      return {
        ...order,
        date: order.closedAt || order.createdAt,
        partsPrice: partsPrice,
        cost: partsCost,
        total: partsPrice,
        profit: profit,
      };
    });
  }, [completedOrders]);

  const totalRevenue = reportData.reduce((sum, item) => sum + item.total, 0);
  const totalNetProfit = reportData.reduce((sum, item) => sum + item.profit, 0);
  const margin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
  const inventoryValue = inventory.reduce((sum, item) => sum + item.costPrice * item.stock, 0);

  const dailyIncomeData = React.useMemo(() => {
     if (reportData.length === 0) return [];
     const dailyData: {[key: string]: number} = {};
     reportData.forEach(item => {
         const day = format(new Date(item.date), 'yyyy-MM-dd');
         if(!dailyData[day]) dailyData[day] = 0;
         dailyData[day] += item.total;
     });
     return Object.entries(dailyData).map(([date, total]) => ({ date, total })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reportData]);

  const orderStatusData = React.useMemo(() => {
    const statusCounts: Record<OrderStatus, number> = {
        'Abierta': 0, 'En Progreso': 0, 'Esperando Piezas': 0,
        'Listo para Entrega': 0, 'Entregada / Cerrada': 0, 'Cancelada': 0
    };
    orders.forEach(order => {
        statusCounts[order.status]++;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name: name as OrderStatus, value })).filter(item => item.value > 0);
  }, [orders]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Reportes Financieros</h1>
          <p className="text-muted-foreground">
            Filtrando datos.
          </p>
        </div>
        <div className="flex items-center gap-4">
             <Select value={filterPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por fecha" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todo el historial</SelectItem>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="last7">Últimos 7 días</SelectItem>
                    <SelectItem value="thisMonth">Este mes</SelectItem>
                    <SelectItem value="lastMonth">Mes pasado</SelectItem>
                </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setFilterPreset('custom'); }} className="w-[160px]"/>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]"/>
             {dateFrom && (
                <Button variant="ghost" size="icon" onClick={clearDates}>
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
      </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">{completedOrders.length} órdenes cerradas</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Ganancia Neta</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">${totalNetProfit.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Después de costos</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Margen</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{margin.toFixed(1)}%</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-orange-500">${inventoryValue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Stock Actual</p>
                </CardContent>
            </Card>
        </div>

      <div className="grid gap-4 md:grid-cols-2">
         <Card>
            <CardHeader>
            <CardTitle>Ingresos por Día</CardTitle>
            </CardHeader>
            <CardContent>
                {dailyIncomeData.length > 0 ? (
                    <ChartContainer config={{ total: { label: "Ingreso", color: "hsl(var(--chart-1))" } }} className="h-[250px] w-full">
                        <ResponsiveContainer>
                        <BarChart data={dailyIncomeData}>
                            <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => format(new Date(value), 'MMM d')} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                            <Tooltip content={<ChartTooltipContent formatter={(value) => `$${Number(value).toFixed(2)}`} />} />
                            <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                    <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
                        <div className="h-10 w-10 relative mb-2">
                            <div className="absolute h-full w-1/3 bg-blue-400 bottom-0 left-0 animate-pulse delay-200"></div>
                            <div className="absolute h-1/2 w-1/3 bg-blue-500 bottom-0 left-1/3 animate-pulse"></div>
                            <div className="absolute h-3/4 w-1/3 bg-blue-300 bottom-0 left-2/3 animate-pulse delay-300"></div>
                        </div>
                        No hay datos en este rango.
                    </div>
                )}
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
            <CardTitle>Estado de Órdenes</CardTitle>
            </CardHeader>
            <CardContent>
                 {orderStatusData.length > 0 ? (
                    <ChartContainer config={orderStatusChartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer>
                             <PieChart>
                                <Pie data={orderStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                     {orderStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltipContent hideLabel />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                 ) : (
                    <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
                         <div className="h-10 w-10 relative mb-2 animate-spin-slow">
                            <div className="absolute h-full w-full rounded-full border-4 border-t-transparent border-orange-300"></div>
                         </div>
                        Sin datos.
                    </div>
                 )}
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right text-destructive">Costo</TableHead>
                <TableHead className="text-right text-green-600">Ganancia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(new Date(item.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-medium">
                       <OrderDetailsDialog order={item} client={clients.find(c => c.id === item.customerId)}>
                            <span className="text-primary hover:underline cursor-pointer">{item.id}</span>
                        </OrderDetailsDialog>
                    </TableCell>
                    <TableCell>{item.customerName}</TableCell>
                    <TableCell className="text-right">${item.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-destructive">${item.cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">${item.profit.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No se encontraron órdenes cerradas en este período. <br/>
                        Asegúrate de cambiar el estado de las órdenes a "Entregada / Cerrada" para verlas aquí.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
            {reportData.length > 0 && (
                <TableFooter>
                    <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3}>Totales</TableCell>
                        <TableCell className="text-right">${totalRevenue.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-destructive">${reportData.reduce((acc, item) => acc + item.cost, 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-600">${totalNetProfit.toFixed(2)}</TableCell>
                    </TableRow>
                </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );

    