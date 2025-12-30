"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, Save } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import { Expense } from "@/lib/types";

const expenseFormSchema = z.object({
  description: z.string().min(3, "La descripción es requerida."),
  category: z.string().min(3, "La categoría es requerida."),
  supplierId: z.string({ required_error: "Por favor selecciona un proveedor." }),
  invoiceNumber: z.string().optional(),
  date: z.string(),
  totalAmount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero."),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { expenses, suppliers, updateExpense } = useDataContext();

  const expense = React.useMemo(() => expenses.find((e) => e.id === params.id), [expenses, params.id]);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
  });

  React.useEffect(() => {
    if (expense) {
      form.reset({
        ...expense,
        date: format(parseISO(expense.date), 'yyyy-MM-dd'),
      });
    }
  }, [expense, form]);

  const onSubmit = (data: ExpenseFormValues) => {
    if (!expense) return;
    const supplier = suppliers.find(s => s.id === data.supplierId);
    
    const updatedExpenseData = {
        id: expense.id,
        ...data,
        supplierName: supplier?.name || 'N/A',
        date: new Date(data.date).toISOString(),
    };
    
    updateExpense(updatedExpenseData as Expense);

    toast({
      title: "Gasto Actualizado",
      description: `El gasto "${data.description}" ha sido actualizado.`,
    });
    router.push("/expenses");
  };

  if (!expense) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-4xl font-bold">Gasto no encontrado</h1>
        <p className="text-muted-foreground">El gasto que buscas no existe o ha sido eliminado.</p>
        <Button asChild className="mt-4">
          <Link href="/expenses">Volver a Gastos</Link>
        </Button>
      </div>
    );
  }
  
  const expenseCategories = ['Renta', 'Servicios Públicos', 'Sueldos', 'Marketing', 'Insumos de Oficina', 'Transporte', 'Reparaciones y Mantenimiento', 'Comisiones Bancarias', 'Otros'];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Volver</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
          Editar Gasto
        </h1>
        <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => router.push('/expenses')}>Cancelar</Button>
            <Button type="submit" form="expense-edit-form"><Save className="mr-2 h-4 w-4"/>Guardar Cambios</Button>
        </div>
      </div>
      <form id="expense-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardHeader>
            <CardTitle>Detalles del Gasto</CardTitle>
            <CardDescription>Actualiza la información del registro de gasto.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input id="description" {...form.register("description")} placeholder="Ej. Renta del local mes de Junio" />
                    {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
                </div>
                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="category">Categoría</Label>
                         <Controller
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar categoría..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {expenseCategories.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.category && <p className="text-sm text-destructive mt-2">{form.formState.errors.category.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="supplierId">Proveedor / Beneficiario</Label>
                        <Controller
                            control={form.control}
                            name="supplierId"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar proveedor..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.supplierId && <p className="text-sm text-destructive mt-2">{form.formState.errors.supplierId.message}</p>}
                    </div>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="totalAmount">Monto Total</Label>
                        <Input id="totalAmount" type="number" step="0.01" {...form.register("totalAmount")} placeholder="0.00" />
                        {form.formState.errors.totalAmount && <p className="text-sm text-destructive">{form.formState.errors.totalAmount.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="invoiceNumber">Número de Factura (Opcional)</Label>
                        <Input id="invoiceNumber" {...form.register("invoiceNumber")} placeholder="Ej. FAC-2024-123" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Fecha</Label>
                        <Input id="date" type="date" {...form.register("date")} />
                        {form.formState.errors.date && <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>}
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="notes">Notas (Opcional)</Label>
                    <Textarea
                        id="notes"
                        {...form.register("notes")}
                        placeholder="Añade notas adicionales sobre el gasto..."
                        rows={3}
                    />
                </div>
            </CardContent>
        </Card>
      </form>
    </div>
  );
}
