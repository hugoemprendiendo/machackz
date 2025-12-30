"use client";

import { AlertTriangle, Database, Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import { Alert, AlertDescription } from "../ui/alert";


export function SeedDatabaseCard() {
  const { toast } = useToast();
  const { seedDatabase } = useDataContext();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSeed = async () => {
    setIsLoading(true);
    try {
      await seedDatabase();
      toast({
        title: "Base de Datos Poblada",
        description: "Los datos de prueba han sido cargados exitosamente.",
      });
    } catch (error) {
      console.error("Database seeding failed:", error);
      toast({
        variant: "destructive",
        title: "Error al poblar la base de datos",
        description: "Ocurrió un error. Revisa la consola para más detalles.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cargar Datos de Prueba</CardTitle>
        <CardDescription>
          Puebla tu base de datos de Firebase con un conjunto de datos de prueba para ver la aplicación en acción.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Advertencia:</strong> Esta acción borrará todos los datos existentes en las colecciones (clientes, inventario, órdenes, etc.) y los reemplazará con los datos de prueba.
          </AlertDescription>
        </Alert>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={isLoading}>
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Database className="mr-2 h-4 w-4" />
                )}
              Cargar Datos de Prueba
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es irreversible y eliminará todos los datos actuales de la base de datos para reemplazarlos por los datos de prueba.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSeed} className="bg-destructive hover:bg-destructive/90">
                Sí, borrar y cargar datos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
