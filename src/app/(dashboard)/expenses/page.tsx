"use client";

import { PlusCircle, MoreHorizontal, Trash2 } from "lucide-react";
import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDataContext } from "@/context/data-context";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@/lib/types";

function DeleteExpenseDialog({ expense, onConfirm }: { expense: Expense, onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive focus:bg-destructive/10">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Eliminar</span>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto "{expense.description}" por un monto de ${expense.totalAmount.toFixed(2)}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">Eliminar Gasto</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ExpensesPage() {
  const { expenses, deleteExpense } = useDataContext();
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = (expense: Expense) => {
    deleteExpense(expense.id);
    toast({
        title: "Gasto Eliminado",
        description: `El gasto "${expense.description}" ha sido eliminado.`
    });
  }

  const sortedExpenses = React.useMemo(() => [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [expenses]);

  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold tracking-tight">Gastos</h1>
                <p className="text-muted-foreground">Registra y visualiza los gastos del negocio.</p>
            </div>
            <Button asChild>
                <Link href="/expenses/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Gasto
                </Link>
            </Button>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Historial de Gastos</CardTitle>
                <CardDescription>Todos los gastos y facturas registrados.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Factura No.</TableHead>
                    <TableHead className="text-right">Monto Total</TableHead>
                    <TableHead>
                        <span className="sr-only">Acciones</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                        <TableCell>{format(parseISO(expense.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">
                            <Link href={`/expenses/${expense.id}`} className="text-primary hover:underline">
                                {expense.description}
                            </Link>
                        </TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.supplierName}</TableCell>
                        <TableCell>{expense.invoiceNumber}</TableCell>
                        <TableCell className="text-right">${expense.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/expenses/${expense.id}`)}>Ver/Editar Detalles</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DeleteExpenseDialog expense={expense} onConfirm={() => handleDelete(expense)} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
