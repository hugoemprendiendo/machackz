
"use client";

import React, { useState } from 'react';
import { useCSVReader } from 'react-papaparse';
import { Upload, File, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useDataContext } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Progress } from '../ui/progress';

interface ClientImportDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const requiredHeaders = ['name', 'email', 'phone', 'address', 'notes'];

export function ClientImportDialog({ children, open, onOpenChange }: ClientImportDialogProps) {
  const { CSVReader } = useCSVReader();
  const { addClient } = useDataContext();
  const { toast } = useToast();

  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const resetState = () => {
    setParsedData([]);
    setFileName('');
    setError('');
    setIsImporting(false);
    setImportProgress(0);
  };

  const handleUploadAccepted = (results: any) => {
    setError('');
    const headers = results.data[0].map((h: string) => h.toLowerCase().trim());
    const missingHeaders = requiredHeaders.filter(
      (rh) => rh !== 'notes' && rh !== 'address' && !headers.includes(rh)
    );

    if (missingHeaders.length > 0) {
      setError(`Faltan las siguientes columnas requeridas en el archivo CSV: ${missingHeaders.join(', ')}`);
      return;
    }

    const data = results.data.slice(1).map((row: any) => {
      const client: any = {};
      headers.forEach((header: string, i: number) => {
        if(requiredHeaders.includes(header)){
            client[header] = row[i];
        }
      });
      return client;
    }).filter((client: any) => client.name && (client.phone || client.email)); // Filter out empty rows

    setParsedData(data);
  };
  
  const handleImport = async () => {
    setIsImporting(true);
    let importedCount = 0;
    const totalToImport = parsedData.length;

    for (let i = 0; i < totalToImport; i++) {
        const client = parsedData[i];
        try {
            await addClient({
                name: client.name || '',
                email: client.email || '',
                phone: client.phone || '',
                address: client.address || '',
                notes: client.notes || '',
            });
            importedCount++;
        } catch (e) {
            console.error(`Error al importar cliente ${client.name}:`, e);
        }
        setImportProgress(((i + 1) / totalToImport) * 100);
    }
    
    setIsImporting(false);
    onOpenChange(false);
    toast({
        title: "Importación Completada",
        description: `${importedCount} de ${totalToImport} clientes han sido importados exitosamente.`
    });
    resetState();
  }
  
  const createCSVTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + requiredHeaders.join(',') + '\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_clientes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
            resetState();
        }
        onOpenChange(isOpen)
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Clientes desde CSV</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV para importar múltiples clientes a la vez.
          </DialogDescription>
        </DialogHeader>

        {parsedData.length === 0 && !isImporting && (
          <CSVReader
            onUploadAccepted={(results: any) => {
              handleUploadAccepted(results);
            }}
            onDragOver={(event: DragEvent) => {
                event.preventDefault();
            }}
            onDragLeave={(event: DragEvent) => {
                event.preventDefault();
            }}
          >
            {({ getRootProps, acceptedFile, getRemoveFileProps }: any) => (
              <div {...getRootProps()} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg text-center my-4 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                <Upload className="h-12 w-12 text-gray-400" />
                <p className="mt-4 text-gray-600">
                  Arrastra y suelta tu archivo CSV aquí, o haz clic para seleccionarlo.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  El archivo debe contener las columnas: name, email, phone. Opcionales: address, notes.
                </p>
                {acceptedFile && (
                    <div className="mt-4 flex items-center gap-2 bg-gray-100 p-2 rounded-md">
                        <File className="h-5 w-5 text-gray-500" />
                        <span className="text-sm">{acceptedFile.name}</span>
                        <button {...getRemoveFileProps()} className="ml-2 p-1 rounded-full hover:bg-gray-200">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
                {error && (
                    <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-md">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}
                 <Button type="button" variant="link" size="sm" onClick={(e) => { e.stopPropagation(); createCSVTemplate();}} className="mt-4">
                    Descargar plantilla CSV
                </Button>
              </div>
            )}
          </CSVReader>
        )}

        {parsedData.length > 0 && !isImporting && (
          <div>
            <h4 className="font-semibold mb-2">Vista Previa de Importación</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Se encontraron {parsedData.length} clientes para importar desde <span className="font-medium">{fileName}</span>. Por favor, verifica los datos.
            </p>
            <ScrollArea className="h-64 border rounded-md">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Teléfono</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parsedData.slice(0, 10).map((client, index) => (
                            <TableRow key={index}>
                                <TableCell>{client.name}</TableCell>
                                <TableCell>{client.email}</TableCell>
                                <TableCell>{client.phone}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
            {parsedData.length > 10 && <p className="text-xs text-center text-muted-foreground mt-2">Mostrando los primeros 10 de {parsedData.length} registros.</p>}
          </div>
        )}
        
        {isImporting && (
             <div className="flex flex-col items-center justify-center p-8 text-center my-4">
                <h3 className="text-lg font-semibold">Importando clientes...</h3>
                <p className="text-sm text-muted-foreground mb-4">Por favor espera, esto puede tardar unos momentos.</p>
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm mt-2">{Math.round(importProgress)}% completado</p>
             </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleImport} disabled={parsedData.length === 0 || isImporting}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirmar e Importar {parsedData.length > 0 ? `(${parsedData.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
