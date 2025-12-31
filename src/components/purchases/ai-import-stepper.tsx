
"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parse } from "date-fns";
import { Loader2, UploadCloud, Wand2, PlusCircle, Trash2, ArrowRight, ArrowLeft, Save, Sparkles, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useDataContext } from "@/context/data-context";
import { NewProductDialog } from "@/components/inventory/new-product-dialog";
import type { InventoryItem } from "@/lib/types";
import { extractInvoiceDetails } from "@/ai/flows/extract-invoice-details";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

// --- Helper Functions & Schemas ---

const purchaseItemSchema = z.object({
  itemId: z.string().min(1, "Selecciona o crea un producto."),
  itemNameFromAI: z.string().optional(),
  itemSKUFromAI: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1."),
  unitCost: z.coerce.number().min(0, "El costo debe ser positivo."),
});

const purchaseFormSchema = z.object({
  supplierId: z.string({ required_error: "Por favor selecciona un proveedor." }),
  invoiceNumber: z.string().optional(),
  date: z.string(),
  items: z.array(purchaseItemSchema).min(1, "Debes añadir al menos un producto."),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

function levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function findClosestMatchByName(name: string, list: {id: string, name: string}[]) {
    if (!name || list.length === 0) return null;
    const lowerCaseName = name.toLowerCase().trim();
    let bestMatch = null;
    let highestScore = -1;

    list.forEach(item => {
        const itemNameLower = item.name.toLowerCase().trim();
        let score = 0;
        if (itemNameLower === lowerCaseName) {
            score = 100;
        } else if (itemNameLower.includes(lowerCaseName) || lowerCaseName.includes(itemNameLower)) {
            const lengthDifference = Math.abs(itemNameLower.length - lowerCaseName.length);
            score = 80 - lengthDifference;
        } else {
            const distance = levenshtein(lowerCaseName, itemNameLower);
            score = (1 - (distance / Math.max(lowerCaseName.length, itemNameLower.length))) * 70;
        }
        if (score > highestScore) {
            highestScore = score;
            bestMatch = item.id;
        }
    });
    return highestScore > 60 ? bestMatch : null;
}

// --- Stepper Component ---

export function AiImportStepper() {
    const [step, setStep] = React.useState(1);
    const { toast } = useToast();
    const router = useRouter();
    const { suppliers, inventory, addStockEntry, updateInventoryStock } = useDataContext();
    const [isProductDialogOpen, setProductDialogOpen] = React.useState(false);
    const [itemToCreate, setItemToCreate] = React.useState<{ name: string; sku?: string; index: number } | null>(null);

    const form = useForm<PurchaseFormValues>({
        resolver: zodResolver(purchaseFormSchema),
        defaultValues: { date: format(new Date(), "yyyy-MM-dd"), items: [] },
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const [isAiLoading, setIsAiLoading] = React.useState(false);
    const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const watchedItems = form.watch("items");
    const { subtotal, taxTotal, totalCost } = React.useMemo(() => {
        const calculated = (watchedItems || []).reduce((acc, item) => {
            const product = inventory.find(p => p.id === item.itemId);
            const itemCost = (item.quantity || 0) * (item.unitCost || 0);
            acc.subtotal += itemCost;
            if (product?.hasTax) {
                acc.taxTotal += itemCost * ((product.taxRate || 0) / 100);
            }
            return acc;
        }, { subtotal: 0, taxTotal: 0 });
        return { ...calculated, totalCost: calculated.subtotal + calculated.taxTotal };
    }, [watchedItems, inventory]);
    
    // --- Step 1: File Upload & Analysis ---
    const handleAnalyzeInvoice = async () => {
        const supplierId = form.getValues("supplierId");
        if (!invoiceFile) {
            toast({ variant: "destructive", title: "No hay archivo", description: "Por favor, selecciona un archivo de factura." });
            return;
        }
        if (!supplierId) {
            toast({ variant: "destructive", title: "Falta proveedor", description: "Por favor, selecciona un proveedor antes de analizar." });
            return;
        }

        setIsAiLoading(true);
        const reader = new FileReader();
        reader.readAsDataURL(invoiceFile);

        reader.onload = async () => {
            try {
                const result = await extractInvoiceDetails({
                    invoiceData: reader.result as string,
                    contentType: invoiceFile.type,
                });
                
                form.setValue("invoiceNumber", result.invoiceNumber);
                try {
                    if (result.date) {
                        const parsedDate = parse(result.date, 'yyyy-MM-dd', new Date());
                        if (!isNaN(parsedDate.getTime())) form.setValue("date", format(parsedDate, "yyyy-MM-dd"));
                    }
                } catch (e) { console.error("Could not parse date from AI, leaving default.", e) }

                const physicalInventory = inventory.filter(i => !i.isService);
                const newItems = result.items.map(item => {
                    let existingProductId: string | null = null;
                    
                    // Priority 1: Match by SKU
                    if (item.sku) {
                        const product = physicalInventory.find(p => p.sku && p.sku.toLowerCase() === item.sku!.toLowerCase());
                        if(product) existingProductId = product.id;
                    }
                    
                    // Priority 2: Match by name if no SKU match
                    if (!existingProductId) {
                       existingProductId = findClosestMatchByName(item.name, physicalInventory);
                    }
                    
                    return {
                        itemId: existingProductId || "",
                        quantity: item.quantity,
                        unitCost: item.unitCost,
                        itemNameFromAI: existingProductId ? undefined : item.name,
                        itemSKUFromAI: item.sku, // Pass SKU regardless for display
                    };
                });
                form.setValue("items", newItems);
                toast({ title: "Factura Analizada", description: "Revisa los productos encontrados. Vincula o crea los productos nuevos." });
                setStep(2);
            } catch (error) {
                console.error("AI Invoice Analysis Error:", error);
                toast({ variant: "destructive", title: "Error de IA", description: "No se pudo analizar la factura. Inténtalo de nuevo." });
            } finally {
                setIsAiLoading(false);
            }
        };
        reader.onerror = () => {
            setIsAiLoading(false);
            toast({ variant: "destructive", title: "Error de Lectura", description: "No se pudo leer el archivo seleccionado." });
        }
    };
    
    // --- Step 2: Review and Create Products ---
    const onProductCreated = (product: InventoryItem) => {
        if (itemToCreate !== null) {
            update(itemToCreate.index, {
                ...watchedItems[itemToCreate.index],
                itemId: product.id,
                itemNameFromAI: undefined,
                itemSKUFromAI: product.sku,
            });
            setItemToCreate(null);
        }
        setProductDialogOpen(false);
    };

    const handleCreateProduct = (index: number) => {
        const item = watchedItems[index];
        setItemToCreate({ name: item.itemNameFromAI!, sku: item.itemSKUFromAI, index });
        setProductDialogOpen(true);
    };

    const allItemsMapped = watchedItems.every(item => item.itemId);

    // --- Step 3: Final Submission ---
    const onSubmit = (data: PurchaseFormValues) => {
        const supplier = suppliers.find(s => s.id === data.supplierId);
        const newStockEntry = {
            supplierId: data.supplierId,
            supplierName: supplier?.name || 'N/A',
            invoiceNumber: data.invoiceNumber || '',
            date: new Date(data.date).toISOString(),
            totalCost: totalCost,
            items: data.items.map(item => {
                const product = inventory.find(p => p.id === item.itemId);
                if (product && !product.isService) {
                    updateInventoryStock(item.itemId, product.stock + item.quantity);
                }
                return {
                    itemId: item.itemId,
                    name: product?.name || 'N/A',
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    taxRate: product?.taxRate || 0,
                    hasTax: product?.hasTax || false,
                }
            })
        };
        
        addStockEntry(newStockEntry);
        toast({ title: "Compra Registrada", description: `La compra ha sido registrada y el stock actualizado.` });
        router.push("/purchases");
    };

    return (
        <>
            {/* Step 1: Upload */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Paso 1: Sube tu Factura</CardTitle>
                        <CardDescription>Selecciona el proveedor y el archivo de la factura (XML, PDF o imagen) para comenzar.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-2">
                            <Label>1. Selecciona el Proveedor *</Label>
                             <Controller
                                control={form.control}
                                name="supplierId"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar proveedor..."/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map(s => ( <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem> ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {form.formState.errors.supplierId && <p className="text-sm text-destructive mt-2">{form.formState.errors.supplierId.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>2. Sube la Factura *</Label>
                            <div 
                                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary transition-colors h-[88px]"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <UploadCloud className="w-8 h-8 text-muted-foreground"/>
                                <p className="mt-1 text-xs text-muted-foreground truncate max-w-full px-2">
                                    {invoiceFile ? `${invoiceFile.name}` : "Haz clic para subir archivo"}
                                </p>
                                <Input ref={fileInputRef} type="file" className="hidden" accept="image/*,application/xml,text/xml,application/pdf" onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)} />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleAnalyzeInvoice} disabled={isAiLoading || !invoiceFile || !form.watch("supplierId")} className="ml-auto">
                            {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                            {isAiLoading ? 'Analizando...' : 'Analizar Factura'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Paso 2: Revisa y Vincula los Productos</CardTitle>
                        <CardDescription>La IA ha extraído estos productos. Vincula los productos nuevos a tu inventario existente o créalos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/3">Producto (Factura)</TableHead>
                                    <TableHead>SKU (Factura)</TableHead>
                                    <TableHead className="w-1/3">Producto (Inventario)</TableHead>
                                    <TableHead>Cant.</TableHead>
                                    <TableHead>Costo</TableHead>
                                    <TableHead><span className="sr-only">Acciones</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => {
                                 const itemIsMapped = !!watchedItems[index]?.itemId;
                                return (
                                <TableRow key={field.id} className={!itemIsMapped ? 'bg-amber-50 dark:bg-amber-950/50' : ''}>
                                    <TableCell>
                                        <div className="font-medium">{field.itemNameFromAI || inventory.find(p => p.id === field.itemId)?.name}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs text-muted-foreground">{field.itemSKUFromAI || inventory.find(p => p.id === field.itemId)?.sku}</div>
                                    </TableCell>
                                    <TableCell>
                                         <Controller
                                            control={form.control}
                                            name={`items.${index}.itemId`}
                                            render={({ field: controllerField }) => (
                                            <div className="flex items-center gap-2">
                                                <Select onValueChange={controllerField.onChange} value={controllerField.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar producto..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {inventory.filter(i => !i.isService).map(item => (
                                                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button type="button" size="icon" variant="outline" onClick={() => handleCreateProduct(index)}>
                                                    <PlusCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            )}
                                        />
                                        {form.formState.errors.items?.[index]?.itemId && <p className="text-sm text-destructive mt-1">{form.formState.errors.items?.[index]?.itemId?.message}</p>}
                                    </TableCell>
                                    <TableCell><Input type="number" {...form.register(`items.${index}.quantity`)} className="w-20"/></TableCell>
                                    <TableCell><Input type="number" step="0.01" {...form.register(`items.${index}.unitCost`)} className="w-24" /></TableCell>
                                    <TableCell>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                         {!allItemsMapped && (
                            <Alert variant="destructive" className="mt-4">
                                <Sparkles className="h-4 w-4" />
                                <AlertTitle>Acción Requerida</AlertTitle>
                                <AlertDescription>
                                    Algunos productos no fueron encontrados. Por favor, vincúlalos a un producto existente o crea uno nuevo para continuar.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                     <CardFooter className="justify-between">
                        <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4"/>Volver</Button>
                        <Button onClick={() => setStep(3)} disabled={!allItemsMapped}>
                            Revisar y Guardar <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </CardFooter>
                </Card>
            )}

             {/* Step 3: Confirm */}
            {step === 3 && (
                 <form id="purchase-confirm-form" onSubmit={form.handleSubmit(onSubmit)}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Paso 3: Confirmar y Guardar</CardTitle>
                            <CardDescription>Verifica los totales y guarda la compra. El stock se actualizará automáticamente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-3 gap-4 text-sm">
                                <div><span className="font-semibold">Proveedor:</span> {suppliers.find(s => s.id === form.getValues('supplierId'))?.name}</div>
                                <div><span className="font-semibold">Factura No:</span> {form.getValues('invoiceNumber')}</div>
                                <div><span className="font-semibold">Fecha:</span> {format(parse(form.getValues('date'), 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}</div>
                            </div>
                            <Table>
                                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cant.</TableHead><TableHead>Costo</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {watchedItems.map((item, index) => {
                                        const product = inventory.find(p => p.id === item.itemId);
                                        return (
                                        <TableRow key={`${item.itemId}-${index}`}>
                                            <TableCell>{product?.name}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${(item.quantity * item.unitCost).toFixed(2)}</TableCell>
                                        </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                            <div className="flex flex-col items-end gap-2 text-sm ml-auto w-full max-w-xs pt-4">
                                <div className="flex justify-between w-full"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between w-full"><span>IVA:</span><span>${taxTotal.toFixed(2)}</span></div>
                                <div className="flex justify-between w-full font-bold text-lg border-t pt-2 mt-2"><span>Total:</span><span>${totalCost.toFixed(2)}</span></div>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-between">
                            <Button type="button" variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4"/>Editar Productos</Button>
                            <Button type="submit"><Save className="mr-2 h-4 w-4"/>Confirmar y Registrar Compra</Button>
                        </CardFooter>
                    </Card>
                 </form>
            )}

            <NewProductDialog
                open={isProductDialogOpen}
                onOpenChange={setProductDialogOpen}
                onProductCreated={onProductCreated}
                initialValues={{ name: itemToCreate?.name || '', sku: itemToCreate?.sku || '' }}
            />
        </>
    );
}

    

    