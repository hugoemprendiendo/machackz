
"use client";

import React, { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataContext } from '@/context/data-context';
import { InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AddItemToSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (item: InventoryItem, quantity: number) => void;
}

export function AddItemToSaleDialog({ open, onOpenChange, onAddItem }: AddItemToSaleDialogProps) {
    const { inventory } = useDataContext();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState(1);

    const filteredInventory = useMemo(() => {
        if (!searchQuery) return [];
        const lowercasedQuery = searchQuery.toLowerCase();
        return inventory.filter(item =>
            item.name.toLowerCase().includes(lowercasedQuery) || 
            (item.sku && item.sku.toLowerCase().includes(lowercasedQuery))
        );
    }, [inventory, searchQuery]);

    const handleAddItem = () => {
        if (!selectedItem) return;
        
        if (!selectedItem.isService && selectedItem.stock < quantity) {
            toast({
                variant: 'destructive',
                title: 'Stock Insuficiente',
                description: `No hay suficiente stock para ${selectedItem.name}. Necesitas ${quantity} y solo hay ${selectedItem.stock}.`
            });
            return;
        }

        onAddItem(selectedItem, quantity);
        handleDialogChange(false);
    };
    
    const handleDialogChange = (isOpen: boolean) => {
        if (!isOpen) {
            setSearchQuery("");
            setSelectedItem(null);
            setQuantity(1);
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleDialogChange}>
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
                            <Button onClick={handleAddItem} disabled={!selectedItem} className="mt-5">
                                Añadir
                            </Button>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
