"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useDataContext } from "@/context/data-context";
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import { useMemo } from "react";


const chartConfig = {
  orders: {
    label: "Órdenes",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function OverviewChart() {
    const { orders } = useDataContext();

    const data = useMemo(() => {
        const now = new Date();
        const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));

        return last6Months.map(month => {
            const start = startOfMonth(month);
            const end = endOfMonth(month);
            const monthOrders = orders.filter(order => {
                const orderDate = new Date(order.createdAt);
                return orderDate >= start && orderDate <= end;
            });
            return {
                month: format(month, 'MMM'),
                orders: monthOrders.length,
            };
        });
    }, [orders]);
    
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen General</CardTitle>
        <CardDescription>Órdenes de servicio creadas en los últimos 6 meses.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer>
                <BarChart data={data}>
                    <XAxis
                    dataKey="month"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    />
                    <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                        content={<ChartTooltipContent />}
                        cursor={{ fill: "hsl(var(--muted))" }}
                    />
                    <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
