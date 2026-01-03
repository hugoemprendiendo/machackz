

"use client";

import { PlusCircle, MoreHorizontal, Trash2, Upload } from "lucide-react";
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ClientImportDialog } from "@/components/clients/import-clients-dialog";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

function DeleteClientDialog({ clientId, clientName, onConfirm }: { clientId: string, clientName: string, onConfirm: () => void }) {
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
            Esta acción no se puede deshacer. Esto eliminará permanentemente al cliente <span className="font-bold">{clientName}</span> y todos sus datos asociados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ClientsPage() {
  const { clients, deleteClient } = useDataContext();
  const router = useRouter();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = React.useState(false);

  const handleDelete = (client: {id: string; name: string;}) => {
    deleteClient(client.id);
    toast({
      title: "Cliente Eliminado",
      description: `El cliente ${client.name} ha sido eliminado.`,
    });
  }
  
  const sortedClients = React.useMemo(() => 
    [...clients].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [clients]
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">Gestiona la información de tus clientes.</p>
        </div>
        <div className="flex items-center gap-2">
            <ClientImportDialog open={isImporting} onOpenChange={setIsImporting}>
              <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Importar
              </Button>
            </ClientImportDialog>
            <Button asChild>
            <Link href="/clients/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Cliente
            </Link>
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>Aquí puedes ver y buscar todos tus clientes.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.taxId}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>
                      {client.source && <Badge variant="secondary">{client.source}</Badge>}
                    </TableCell>
                    <TableCell>{format(parseISO(client.createdAt), 'dd/MM/yyyy')}</TableCell>
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
                          <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DeleteClientDialog clientId={client.id} clientName={client.name} onConfirm={() => handleDelete(client)} />
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
