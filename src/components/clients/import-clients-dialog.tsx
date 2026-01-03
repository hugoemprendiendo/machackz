
"use client";

import React, { useState } from 'react';
import { useCSVReader } from 'react-papaparse';
import { Upload, File, CheckCircle, AlertTriangle, X, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
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
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface ClientImportDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const clientFields = ['name', 'email', 'phone', 'address', 'taxId', 'cfdiUse', 'source', 'notes'] as const;
type ClientField = typeof clientFields[number];

type MappedFields = Partial<Record<ClientField, string>>;


export function ClientImportDialog({ children, open, onOpenChange }: ClientImportDialogProps) {
  const { CSVReader } = useCSVReader();
  const { addClient } = useDataContext();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [csvData, setCsvData] = useState<{ headers: string[], rows: string[][] }>({ headers: [], rows: [] });
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [mappedFields, setMappedFields] = useState<MappedFields>({});

  const resetState = () => {
    setStep(1);
    setCsvData({ headers: [], rows: [] });
    setError('');
    setIsImporting(false);
    setImportProgress(0);
    setMappedFields({});
  };
  
  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  const handleUploadAccepted = (results: any) => {
    setError('');
    const fileData = results.data;
    if (fileData.length < 2) {
      setError("El archivo CSV debe tener al menos una fila de encabezados y una fila de datos.");
      return;
    }
    const headers = fileData[0].map((h: string) => h.trim());
    const rows = fileData.slice(1).filter((row: any[]) => row.some(cell => cell && cell.trim() !== ''));
    
    setCsvData({ headers, rows });
    setStep(2);
    toast({ title: "Archivo Cargado", description: "Por favor, mapea las columnas del archivo." });
  };
  
  const handleMappingSubmit = () => {
     if (!mappedFields.name || !mappedFields.phone) {
        toast({
            variant: "destructive",
            title: "Mapeo Incompleto",
            description: "Debes mapear al menos los campos 'name' y 'phone'."
        });
        return;
    }
    setStep(3);
  };

  const importedClientsPreview = React.useMemo(() => {
    if (csvData.rows.length === 0) return [];
    
    const nameIndex = csvData.headers.indexOf(mappedFields.name!);
    const emailIndex = mappedFields.email ? csvData.headers.indexOf(mappedFields.email) : -1;
    const phoneIndex = mappedFields.phone ? csvData.headers.indexOf(mappedFields.phone) : -1;
    const addressIndex = mappedFields.address ? csvData.headers.indexOf(mappedFields.address) : -1;
    const taxIdIndex = mappedFields.taxId ? csvData.headers.indexOf(mappedFields.taxId) : -1;
    const cfdiUseIndex = mappedFields.cfdiUse ? csvData.headers.indexOf(mappedFields.cfdiUse) : -1;
    const sourceIndex = mappedFields.source ? csvData.headers.indexOf(mappedFields.source) : -1;
    const notesIndex = mappedFields.notes ? csvData.headers.indexOf(mappedFields.notes) : -1;

    return csvData.rows.map(row => ({
      name: row[nameIndex] || '',
      email: emailIndex > -1 ? row[emailIndex] : '',
      phone: phoneIndex > -1 ? row[phoneIndex] : '',
      address: addressIndex > -1 ? row[addressIndex] : '',
      taxId: taxIdIndex > -1 ? row[taxIdIndex] : '',
      cfdiUse: cfdiUseIndex > -1 ? row[cfdiUseIndex] : '',
      source: sourceIndex > -1 ? row[sourceIndex] : '',
      notes: notesIndex > -1 ? row[notesIndex] : '',
      createdAt: new Date().toISOString(),
    }));

  }, [csvData, mappedFields]);

  
  const handleImport = async () => {
    setIsImporting(true);
    let importedCount = 0;
    const totalToImport = importedClientsPreview.length;

    for (let i = 0; i < totalToImport; i++) {
        const client = importedClientsPreview[i];
        try {
            await addClient(client);
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
    const csvContent = "data:text/csv;charset=utf-8," + clientFields.filter(f => f !== 'notes').join(',') + '\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_clientes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar Clientes desde CSV (Paso {step} de 3)</DialogTitle>
          {step === 1 && <DialogDescription>Sube un archivo CSV para importar múltiples clientes a la vez.</DialogDescription>}
          {step === 2 && <DialogDescription>Asigna las columnas de tu archivo CSV a los campos de cliente correspondientes.</DialogDescription>}
          {step === 3 && <DialogDescription>Verifica los datos y confirma la importación.</DialogDescription>}
        </DialogHeader>

        {step === 1 && (
          <CSVReader
            onUploadAccepted={handleUploadAccepted}
            onDragOver={(event: DragEvent) => { event.preventDefault(); }}
            onDragLeave={(event: DragEvent) => { event.preventDefault(); }}
          >
            {({ getRootProps, acceptedFile, getRemoveFileProps }: any) => (
              <div {...getRootProps()} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted rounded-lg text-center my-4 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                <Upload className="h-12 w-12 text-gray-400" />
                <p className="mt-4 text-gray-600">
                  Arrastra y suelta tu archivo CSV aquí, o haz clic para seleccionarlo.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Asegúrate de que el archivo tenga una fila de encabezados.
                </p>
                {acceptedFile && (
                    <div className="mt-4 flex items-center gap-2 bg-gray-100 p-2 rounded-md dark:bg-muted/50">
                        <File className="h-5 w-5 text-gray-500" />
                        <span className="text-sm">{acceptedFile.name}</span>
                        <button {...getRemoveFileProps()} className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-muted">
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
        
        {step === 2 && (
            <div className='space-y-4'>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {clientFields.map(field => {
                      return (
                        <div key={field} className="space-y-2">
                            <Label htmlFor={`map-${field}`} className="capitalize">
                                {field} {field === 'name' || field === 'phone' ? '*' : ''}
                            </Label>
                            <Select onValueChange={(value) => setMappedFields(prev => ({...prev, [field]: value}))}>
                                <SelectTrigger id={`map-${field}`}>
                                    <SelectValue placeholder="Seleccionar columna..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {csvData.headers.map((header, index) => <SelectItem key={`${header}-${index}`} value={header}>{header}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                      )}
                    )}
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Vista Previa de los Datos (Primeras 5 filas)
                    </Label>
                    <div className="relative w-full overflow-auto rounded-lg border">
                      <Table>
                          <TableHeader><TableRow>{csvData.headers.map((h, i) => <TableHead key={`${h}-${i}`}>{h}</TableHead>)}</TableRow></TableHeader>
                          <TableBody>{csvData.rows.slice(0,5).map((row, rIndex) => <TableRow key={rIndex}>{row.map((cell, cIndex) => <TableCell key={cIndex} className="whitespace-nowrap">{cell}</TableCell>)}</TableRow>)}</TableBody>
                      </Table>
                    </div>
                </div>
            </div>
        )}

        {step === 3 && !isImporting && (
          <div>
            <h4 className="font-semibold mb-2">Vista Previa de Importación</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Se importarán {importedClientsPreview.length} clientes. Por favor, verifica los datos.
            </p>
            <ScrollArea className="h-64 border rounded-md">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>RFC</TableHead>
                            <TableHead>Fuente</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {importedClientsPreview.slice(0, 20).map((client, index) => (
                            <TableRow key={index}>
                                <TableCell>{client.name}</TableCell>
                                <TableCell>{client.email}</TableCell>
                                <TableCell>{client.phone}</TableCell>
                                <TableCell>{client.taxId}</TableCell>
                                <TableCell>{client.source}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
            {importedClientsPreview.length > 20 && <p className="text-xs text-center text-muted-foreground mt-2">Mostrando los primeros 20 de {importedClientsPreview.length} registros.</p>}
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

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancelar
          </Button>

           {step > 1 && step < 3 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
           )}

           {step === 2 && (
             <Button type="button" onClick={handleMappingSubmit}>
                Previsualizar Datos <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
           )}
          
          {step === 3 && (
            <Button type="button" onClick={handleImport} disabled={importedClientsPreview.length === 0 || isImporting}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmar e Importar {importedClientsPreview.length > 0 ? `(${importedClientsPreview.length})` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
