
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataContext } from '@/context/data-context';
import { InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AddPartDialogProps {
  saleId: string;
}

export function AddPartDialog({ saleId }: AddPartDialogProps) {
    const { addMultiplePartsToOrder } = useDataContext(); // Note: This function is for Orders, we need one for sales.
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    
    // This is a temporary workaround. Inventory should come from context.
    useEffect(() => {
        const { inventory: contextInventory } = useDataContext();
        setInventory(contextInventory);
    }, [isOpen]);

    const filteredInventory = useMemo(() => {
        if (!searchQuery) return [];
        const lowercasedQuery = searchQuery.toLowerCase();
        return inventory.filter(item =>
            item.name.toLowerCase().includes(lowercasedQuery) || 
            (item.sku && item.sku.toLowerCase().includes(lowercasedQuery))
        );
    }, [inventory, searchQuery]);

    const handleAddItem = async () => {
        if (!selectedItem) return;

        setIsAdding(true);
        if (!selectedItem.isService && selectedItem.stock < quantity) {
            toast({
                variant: 'destructive',
                title: 'Sin Stock',
                description: `No hay suficiente stock para ${selectedItem.name}. Necesitas ${quantity} pero solo hay ${selectedItem.stock}.`
            });
            setIsAdding(false);
            return;
        }

        try {
            await addMultiplePartsToOrder(saleId, [{ itemId: selectedItem.id, quantity: quantity }]);
            handleOpenChange(false);
        } catch (error) {
            console.error("Error adding part to sale:", error);
        } finally {
            setIsAdding(false);
        }
    };
    
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSearchQuery("");
            setSelectedItem(null);
            setQuantity(1);
        }
        setIsOpen(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">Añadir Item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Añadir Item a la Venta</DialogTitle>
                    <DialogDescription>Busca un producto o servicio para añadirlo.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <Input
                        placeholder="Buscar Producto..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedItem(null);
                        }}
                        disabled={isAdding}
                    />
                    <ScrollArea className="h-64 border rounded-md">
                        <div className="p-2">
                            {filteredInventory.length > 0 ? (
                                filteredInventory.map(item => (
                                    <div
                                        key={item.id}
                                        className={cn("flex justify-between items-center p-2 rounded-md cursor-pointer hover:bg-muted", {
                                            "bg-muted": selectedItem?.id === item.id,
                                        })}
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        <div>
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.isService ? 'Servicio' : `Stock: ${item.stock}`}
                                            </div>
                                        </div>
                                        <div className="font-medium">${item.sellingPrice.toFixed(2)}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-center text-muted-foreground p-4">
                                    {searchQuery ? "No se encontraron productos." : "Comienza a escribir para buscar..."}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    {selectedItem && (
                        <div className="flex items-center gap-4 p-2 border rounded-lg bg-muted/50">
                             <div className="flex-1">
                                <Label htmlFor="quantity">Cantidad para <span className="font-semibold">{selectedItem.name}</span></Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="mt-1"
                                    min="1"
                                    max={selectedItem.isService ? undefined : selectedItem.stock}
                                />
                            </div>
                            <Button onClick={handleAddItem} disabled={isAdding} className="mt-5">
                                {isAdding ? <Loader2 className="animate-spin"/> : 'Añadir'}
                            </Button>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isAdding}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
