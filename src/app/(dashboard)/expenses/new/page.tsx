"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, PlusCircle } from "lucide-react";
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

export default function NewExpensePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { suppliers, addExpense } = useDataContext();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      category: "",
      invoiceNumber: "",
      notes: "",
      totalAmount: 0,
    },
  });

  const onSubmit = (data: ExpenseFormValues) => {
    const supplier = suppliers.find(s => s.id === data.supplierId);
    
    const newExpenseData = {
        ...data,
        supplierName: supplier?.name || 'N/A',
        date: new Date(data.date).toISOString(),
    };
    
    addExpense(newExpenseData);

    toast({
      title: "Gasto Registrado",
      description: `El gasto "${data.description}" ha sido registrado.`,
    });
    router.push("/expenses");
  };

  const expenseCategories = ['Renta', 'Servicios Públicos', 'Sueldos', 'Marketing', 'Insumos de Oficina', 'Transporte', 'Reparaciones y Mantenimiento', 'Comisiones Bancarias', 'Otros'];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Volver</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-headline font-semibold tracking-tight sm:grow-0">
          Registrar Nuevo Gasto
        </h1>
        <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => router.push('/expenses')}>Cancelar</Button>
            <Button type="submit" form="expense-new-form">Guardar Gasto</Button>
        </div>
      </div>
      <form id="expense-new-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardHeader>
            <CardTitle>Detalles del Gasto</CardTitle>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
