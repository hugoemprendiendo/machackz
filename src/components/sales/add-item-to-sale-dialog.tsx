
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
import { InventoryItem, OrderPart } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AddItemToSaleDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (item: Omit<OrderPart, 'name'> & { name: string }) => void;
}

export function AddItemToSaleDialog({ open, onOpenChange, onAddItem, children }: AddItemToSaleDialogProps) {
    const { inventory } = useDataContext();
    const { toast } = useToast();
    
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(0);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (selectedItem) {
            setPrice(selectedItem.sellingPrice);
        }
    }, [selectedItem]);

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

        onAddItem({
            itemId: selectedItem.id,
            name: selectedItem.name,
            quantity: quantity,
            unitPrice: price,
            unitCost: selectedItem.costPrice,
            taxRate: selectedItem.taxRate,
            lotId: selectedItem.isService ? 'SERVICE' : '' // Lot ID will be determined in the backend transaction
        });
        
        setIsAdding(false);
        handleOpenChange(false);
    };
    
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSearchQuery("");
            setSelectedItem(null);
            setQuantity(1);
            setPrice(0);
        }
        onOpenChange(open);
    };
    
    const handleDesglosarIva = () => {
        const currentPrice = price;
        if (currentPrice > 0) {
            setPrice(parseFloat((currentPrice / 1.16).toFixed(2)));
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
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
                        <div className="grid grid-cols-2 gap-4 p-2 border rounded-lg bg-muted/50">
                             <div>
                                <Label htmlFor="quantity">Cantidad</Label>
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
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="price">Precio Unit.</Label>
                                    <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={handleDesglosarIva}>Desglosar IVA</Button>
                                </div>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isAdding}>Cerrar</Button>
                     <Button onClick={handleAddItem} disabled={isAdding || !selectedItem}>
                        {isAdding ? <Loader2 className="animate-spin"/> : 'Añadir'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
