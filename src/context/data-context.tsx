
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { collection, doc, writeBatch, getDocs, query, serverTimestamp, runTransaction, where, orderBy, getDoc, DocumentReference, DocumentData, deleteDoc, addDoc, updateDoc, onSnapshot } from "firebase/firestore";
import type { InventoryItem, Client, Supplier, Order, StockEntry, OrderStatus, OrderPart, AppSettings, StockEntryItem, StockLot, Sale, SaleStatus, Expense } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { seedClients, seedSuppliers, seedInventory, seedOrders, seedStockEntries } from '@/lib/seed-data';
import { useToast } from '@/hooks/use-toast';

const initialSettings: AppSettings = {
    receptionNotes: 'El diagnóstico puede tomar de 24 a 72hs. La garantía sobre la reparación es de 30 días. No nos hacemos responsables por equipos abandonados después de 90 días.',
    deliveryNotes: 'El equipo se entrega en las condiciones descritas. La garantía sobre la reparación es de 30 días y cubre únicamente las fallas relacionadas con el servicio realizado.',
};

interface DataContextProps {
  clients: Client[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  orders: Order[];
  sales: Sale[];
  stockEntries: StockEntry[];
  expenses: Expense[];
  settings: AppSettings;
  isLoading: boolean;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<any>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<any>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (supplierId: string) => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<any>;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  addOrder: (order: Omit<Order, 'id' | 'status' | 'parts'>) => Promise<any>;
  updateOrderStatus: (orderId: string, status: OrderStatus, closedAt?: Date) => Promise<void>;
  updateOrderDetails: (orderId: string, details: { problemDescription?: string; diagnosis?: string; }) => Promise<void>;
  removePartFromOrder: (orderId: string, partToRemove: OrderPart) => Promise<void>;
  addSale: (saleData: Omit<Sale, 'id' | 'status' | 'total' | 'subtotal' | 'taxTotal' | 'createdAt'>) => Promise<string>;
  updateSaleStatus: (saleId: string, status: SaleStatus) => Promise<void>;
  removeItemFromSale: (saleId: string, partToRemove: OrderPart) => Promise<void>;
  addStockEntry: (entry: Omit<StockEntry, 'id'>) => Promise<any>;
  updateStockEntry: (entry: StockEntry) => Promise<void>;
  deleteStockEntry: (entryId: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<any>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addMultiplePartsToOrder: (orderId: string, items: { itemId: string; quantity: number }[]) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  seedDatabase: () => Promise<void>;
  migrateInventoryToLots: () => Promise<void>;
  updateInventoryStock: (itemId: string, newStock: number) => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const clientsRef = useMemoFirebase(() => user ? collection(firestore, "clients") : null, [firestore, user]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsRef);
  
  const suppliersRef = useMemoFirebase(() => user ? collection(firestore, "suppliers") : null, [firestore, user]);
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersRef);

  const inventoryRef = useMemoFirebase(() => user ? collection(firestore, "inventory") : null, [firestore, user]);
  const { data: inventoryData, isLoading: isLoadingInventory } = useCollection<InventoryItem>(inventoryRef);

  const ordersRef = useMemoFirebase(() => user ? collection(firestore, "orders") : null, [firestore, user]);
  const { data: ordersData, isLoading: isLoadingOrders } = useCollection<Order>(ordersRef);

  const salesRef = useMemoFirebase(() => user ? collection(firestore, "sales") : null, [firestore, user]);
  const { data: salesData, isLoading: isLoadingSales } = useCollection<Sale>(salesRef);

  const stockEntriesRef = useMemoFirebase(() => user ? collection(firestore, "stockEntries") : null, [firestore, user]);
  const { data: stockEntriesData, isLoading: isLoadingStockEntries } = useCollection<StockEntry>(stockEntriesRef);
  
  const expensesRef = useMemoFirebase(() => user ? collection(firestore, 'expenses') : null, [firestore, user]);
  const { data: expensesData, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesRef);

  const [stockLots, setStockLots] = useState<Record<string, StockLot[]>>({});
  const [isLoadingLots, setIsLoadingLots] = useState(true);

  useEffect(() => {
    if (!inventoryData || !firestore || !user) {
      setIsLoadingLots(true);
      return;
    }
  
    const physicalProducts = inventoryData.filter(item => !item.isService);
    if (physicalProducts.length === 0) {
      setIsLoadingLots(false);
      return;
    }
  
    let listenersAttached = 0;
    const unsubscribers: (() => void)[] = [];
  
    const checkCompletion = () => {
      listenersAttached++;
      if (listenersAttached === physicalProducts.length) {
        setIsLoadingLots(false);
      }
    };
  
    physicalProducts.forEach(item => {
      const lotsRef = collection(firestore, `inventory/${item.id}/stockLots`);
      const q = query(lotsRef, where("quantity", ">", 0), orderBy("createdAt", "asc"));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const lots = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockLot));
        setStockLots(prevLots => ({
          ...prevLots,
          [item.id]: lots,
        }));
        if (!isLoadingLots) { // Avoid check on initial load
            // This part is for real-time updates after initial load
        }
      }, (error) => {
        console.error(`Error listening to lots for item ${item.id}:`, error);
        checkCompletion();
      });
  
      // Manually trigger a get to handle initial load state
      getDocs(q).then(() => {
        checkCompletion();
      }).catch(error => {
        console.error(`Error fetching initial lots for item ${item.id}:`, error);
        checkCompletion();
      });
  
      unsubscribers.push(unsubscribe);
    });
  
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [inventoryData, firestore, user]);

  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  
  useEffect(() => {
    const storedSettings = localStorage.getItem('settings');
    if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
    }
  }, []);
  
  const clients = useMemo(() => clientsData || [], [clientsData]);
  const suppliers = useMemo(() => suppliersData || [], [suppliersData]);
  const orders = useMemo(() => ordersData || [], [ordersData]);
  const sales = useMemo(() => salesData || [], [salesData]);
  const stockEntries = useMemo(() => stockEntriesData || [], [stockEntriesData]);
  const expenses = useMemo(() => expensesData || [], [expensesData]);

  const inventory = useMemo(() => {
    return (inventoryData || []).map(item => {
      if (item.isService) {
        return {
          ...item,
          hasTax: item.hasTax ?? true,
          taxRate: item.taxRate ?? 16,
          isService: true,
          stock: 0, 
        }
      }
      const lots = stockLots[item.id] || [];
      const totalStockFromLots = lots.reduce((sum, lot) => sum + lot.quantity, 0);
      const totalValueFromLots = lots.reduce((sum, lot) => sum + lot.quantity * lot.costPrice, 0);
      const averageCostPrice = totalStockFromLots > 0 ? totalValueFromLots / totalStockFromLots : item.costPrice;

      return {
        ...item,
        hasTax: item.hasTax ?? true,
        taxRate: item.taxRate ?? 16,
        isService: false,
        stock: totalStockFromLots,
        costPrice: averageCostPrice,
      };
    });
  }, [inventoryData, stockLots]);

  const isLoading = isLoadingClients || isLoadingSuppliers || isLoadingInventory || isLoadingOrders || isLoadingStockEntries || isLoadingExpenses || isLoadingLots || isLoadingSales;

  const addClient = useCallback(async (client: Omit<Client, 'id' | 'createdAt'>) => {
    if (!clientsRef) return;
    return addDocumentNonBlocking(clientsRef, {
      ...client,
      source: client.source || '',
      taxId: client.taxId || '',
      cfdiUse: client.cfdiUse || '',
      createdAt: new Date().toISOString(),
    });
  }, [clientsRef]);

  const updateClient = useCallback(async (updatedClient: Client) => {
    const { id, ...data } = updatedClient;
    updateDocumentNonBlocking(doc(firestore, "clients", id), data);
  }, [firestore]);

  const deleteClient = useCallback(async (clientId: string) => {
    deleteDocumentNonBlocking(doc(firestore, "clients", clientId));
  }, [firestore]);

  const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id'>) => {
    if (!suppliersRef) return;
    return addDocumentNonBlocking(suppliersRef, supplier);
  }, [suppliersRef]);

  const updateSupplier = useCallback(async (updatedSupplier: Supplier) => {
    const { id, ...data } = updatedSupplier;
    updateDocumentNonBlocking(doc(firestore, "suppliers", id), data);
  }, [firestore]);

  const deleteSupplier = useCallback(async (supplierId: string) => {
    deleteDocumentNonBlocking(doc(firestore, "suppliers", supplierId));
  }, [firestore]);

  const addInventoryItem = useCallback(async (item: Omit<InventoryItem, 'id'>) => {
    if (!inventoryRef) return;
    const newItemData = { ...item };
    const newDocRef = await addDocumentNonBlocking(inventoryRef, newItemData);
    
    if (!newItemData.isService && newItemData.stock > 0) {
        const productRef = doc(firestore, 'inventory', newDocRef.id);
        const lotsCollectionRef = collection(productRef, 'stockLots');
        const lotRef = doc(lotsCollectionRef);
        const initialLot: Omit<StockLot, 'id'> = {
            purchaseId: 'MIGRATION-INITIAL',
            purchaseDate: new Date().toISOString(),
            createdAt: serverTimestamp(),
            quantity: newItemData.stock,
            costPrice: newItemData.costPrice,
            notes: 'Lote inicial creado desde creación de producto',
        };
        await addDocumentNonBlocking(lotsCollectionRef, initialLot);
    }
    return newDocRef;
  }, [inventoryRef, firestore]);

  const updateInventoryItem = useCallback(async (updatedItem: InventoryItem) => {
    const { id, ...data } = updatedItem;
    updateDocumentNonBlocking(doc(firestore, "inventory", id), data);
  }, [firestore]);

  const updateInventoryStock = useCallback(async (itemId: string, newStock: number) => {
      updateDocumentNonBlocking(doc(firestore, 'inventory', itemId), { stock: newStock });
  }, [firestore]);

  const deleteInventoryItem = useCallback(async (itemId: string) => {
    deleteDocumentNonBlocking(doc(firestore, "inventory", itemId));
  }, [firestore]);
  
  const addOrder = useCallback(async (orderData: Omit<Order, 'id' | 'status' | 'parts'>) => {
    if (!ordersRef) return;
    const newOrder = {
        ...orderData,
        status: 'Abierta' as OrderStatus,
        parts: [],
    };
    return addDocumentNonBlocking(ordersRef, newOrder);
  }, [ordersRef]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, closedAt?: Date) => {
     const updateData: {status: OrderStatus, closedAt?: string} = { status };
     if (status === 'Entregada / Cerrada') {
         updateData.closedAt = (closedAt || new Date()).toISOString();
     }
     updateDocumentNonBlocking(doc(firestore, "orders", orderId), updateData);
  }, [firestore]);

  const updateOrderDetails = useCallback(async (orderId: string, details: { problemDescription?: string; diagnosis?: string; }) => {
    updateDocumentNonBlocking(doc(firestore, "orders", orderId), details);
  }, [firestore]);

  const addStockEntry = useCallback(async (entry: Omit<StockEntry, 'id'>) => {
    if (!firestore) return;
    
    const batch = writeBatch(firestore);
    
    const stockEntryRef = doc(collection(firestore, 'stockEntries'));
    batch.set(stockEntryRef, {...entry, id: stockEntryRef.id});

    for (const item of entry.items) {
        const lotRef = doc(collection(firestore, `inventory/${item.itemId}/stockLots`));
        const newLot: Omit<StockLot, 'id'> = {
            purchaseId: stockEntryRef.id,
            purchaseDate: entry.date,
            createdAt: serverTimestamp(),
            quantity: item.quantity,
            costPrice: item.unitCost,
        };
        batch.set(lotRef, newLot);
    }
    
    await batch.commit();

  }, [firestore]);

  const updateStockEntry = useCallback(async (updatedEntry: StockEntry) => {
    toast({ variant: 'destructive', title: 'Función no implementada', description: 'La edición de compras con sistema FIFO debe hacerse manualmente para asegurar la integridad.' });
  }, [toast]);

 const deleteStockEntry = useCallback(async (entryId: string) => {
    if (!firestore) return;

    try {
      await runTransaction(firestore, async (transaction) => {
        const stockEntryRef = doc(firestore, "stockEntries", entryId);
        const stockEntryDoc = await transaction.get(stockEntryRef);

        if (!stockEntryDoc.exists()) {
          throw new Error("La compra que intentas eliminar no existe.");
        }
        const stockEntry = stockEntryDoc.data() as StockEntry;

        for (const item of stockEntry.items) {
          const lotsQuery = query(
            collection(firestore, `inventory/${item.itemId}/stockLots`),
            where("purchaseId", "==", entryId)
          );
          const lotsSnapshot = await getDocs(lotsQuery); // Not a transaction.get
          
          for (const lotDoc of lotsSnapshot.docs) {
             const lotData = lotDoc.data() as StockLot;
             if (lotData.quantity < item.quantity) {
                 throw new Error(`Parte del stock de ${item.name} (Lote ${lotDoc.id.slice(-4)}) ya fue utilizado. No se puede eliminar la compra.`);
             }
             transaction.delete(lotDoc.ref);
          }
        }
        transaction.delete(stockEntryRef);
      });

      toast({ title: "Compra Eliminada", description: "La compra y su stock asociado han sido revertidos." });
    } catch (e: any) {
      console.error("Error al eliminar la compra:", e);
      toast({
        variant: "destructive",
        title: "Error al Eliminar",
        description: e.message,
      });
    }
  }, [firestore, toast]);
  
  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
    if (!expensesRef) return;
    return addDocumentNonBlocking(expensesRef, expense);
  }, [expensesRef]);

  const updateExpense = useCallback(async (updatedExpense: Expense) => {
    const { id, ...data } = updatedExpense;
    updateDocumentNonBlocking(doc(firestore, 'expenses', id), data);
  }, [firestore]);

  const deleteExpense = useCallback(async (expenseId: string) => {
    deleteDocumentNonBlocking(doc(firestore, 'expenses', expenseId));
  }, [firestore]);

  const updateSettings = useCallback(async (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('settings', JSON.stringify(newSettings));
  }, []);
  
    const addSale = useCallback(async (saleData: Omit<Sale, 'id' | 'status' | 'total' | 'subtotal' | 'taxTotal' | 'createdAt'>) => {
    if (!firestore) throw new Error("Firestore no está inicializado");

    const newSaleRef = doc(collection(firestore, 'sales'));

    try {
      await runTransaction(firestore, async (transaction) => {
        const finalItems: OrderPart[] = [];
        
        for (const item of saleData.items) {
          const product = inventory.find(p => p.id === item.itemId);
          if (!product) throw new Error(`Producto ${item.name} no encontrado.`);

          if (product.isService) {
            finalItems.push({
              itemId: item.itemId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: item.unitCost,
              taxRate: item.taxRate,
              lotId: 'SERVICE'
            });
          } else {
            const lotsQuery = query(collection(firestore, `inventory/${item.itemId}/stockLots`), where("quantity", ">", 0), orderBy("createdAt", "asc"));
            const lotsSnapshot = await getDocs(lotsQuery);

            let quantityNeeded = item.quantity;
            let totalStockInLots = 0;
            lotsSnapshot.docs.forEach(doc => totalStockInLots += doc.data().quantity);

            if (totalStockInLots < quantityNeeded) {
              throw new Error(`Stock insuficiente para ${product.name}. Necesitas ${quantityNeeded}, disponibles ${totalStockInLots}.`);
            }

            for (const lotDoc of lotsSnapshot.docs) {
              if (quantityNeeded <= 0) break;
              const lotData = lotDoc.data() as StockLot;
              const consume = Math.min(quantityNeeded, lotData.quantity);
              
              finalItems.push({
                itemId: item.itemId,
                name: item.name,
                quantity: consume,
                unitPrice: item.unitPrice,
                unitCost: lotData.costPrice,
                taxRate: item.taxRate,
                lotId: lotDoc.id
              });

              transaction.update(lotDoc.ref, { quantity: lotData.quantity - consume });
              quantityNeeded -= consume;
            }
          }
        }

        const { subtotal, taxTotal, total } = finalItems.reduce((acc, part) => {
          const partSubtotal = part.unitPrice * part.quantity;
          const partTax = partSubtotal * (part.taxRate / 100);
          acc.subtotal += partSubtotal;
          acc.taxTotal += partTax;
          acc.total += partSubtotal + partTax;
          return acc;
        }, { subtotal: 0, taxTotal: 0, total: 0 });

        const finalSaleData: Sale = {
          ...saleData,
          id: newSaleRef.id,
          status: 'Completada',
          items: finalItems,
          subtotal,
          taxTotal,
          total,
          createdAt: new Date().toISOString(),
        };

        transaction.set(newSaleRef, finalSaleData);
      });

      toast({ title: 'Venta Registrada', description: `La venta ${newSaleRef.id} ha sido completada.` });
      return newSaleRef.id;

    } catch (error: any) {
        console.error("Error al registrar la venta:", error);
        toast({ variant: 'destructive', title: 'Error en la Venta', description: error.message });
        throw error;
    }
  }, [firestore, inventory, toast]);

  const updateSaleStatus = useCallback(async (saleId: string, status: SaleStatus) => {
      updateDocumentNonBlocking(doc(firestore, 'sales', saleId), { status });
  }, [firestore]);

  const removeItemFromSale = useCallback(async (saleId: string, partToRemove: OrderPart) => {
    if (!firestore) return;
    const { itemId, lotId, quantity } = partToRemove;

    const saleRef = doc(firestore, "sales", saleId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const saleDoc = await transaction.get(saleRef);
            if (!saleDoc.exists()) throw new Error('Venta no encontrada.');

            const currentSale = saleDoc.data() as Sale;
            if (currentSale.status !== 'Borrador') {
              throw new Error('No se pueden eliminar artículos de una venta que no está en estado de borrador.');
            }
            
            const partIndex = currentSale.items.findIndex(p => 
                p.lotId === lotId && 
                p.quantity === quantity &&
                p.itemId === itemId &&
                p.unitCost === partToRemove.unitCost
            );

            if (partIndex === -1) throw new Error('Item no encontrado en la venta.');
            
            const updatedItems = [...currentSale.items.slice(0, partIndex), ...currentSale.items.slice(partIndex + 1)];

            const { subtotal, taxTotal, total } = updatedItems.reduce((acc, part) => {
                const partSubtotal = part.unitPrice * part.quantity;
                const partTax = partSubtotal * (part.taxRate / 100);
                acc.subtotal += partSubtotal;
                acc.taxTotal += partTax;
                acc.total += partSubtotal + partTax;
                return acc;
            }, { subtotal: 0, taxTotal: 0, total: 0 });

            transaction.update(saleRef, { items: updatedItems, subtotal, taxTotal, total });

            if (partToRemove.lotId !== 'SERVICE') {
                const lotRef = doc(firestore, `inventory/${itemId}/stockLots`, lotId);
                const lotDoc = await transaction.get(lotRef);
                if (lotDoc.exists()) {
                    transaction.update(lotRef, { quantity: lotDoc.data().quantity + quantity });
                } else {
                    const newLotData: Omit<StockLot, 'id' | 'createdAt'> = {
                        purchaseId: `RETURN-SALE-${saleId}`,
                        purchaseDate: new Date().toISOString(),
                        quantity: quantity,
                        costPrice: partToRemove.unitCost,
                        notes: `Devolución de Venta #${saleId}`,
                    };
                    transaction.set(lotRef, { ...newLotData, createdAt: serverTimestamp() });
                }
            }
        });
        toast({ title: 'Item devuelto', description: 'El item ha sido devuelto al inventario.' });
    } catch(e: any) {
        console.error("Failed to remove item from sale:", e);
        toast({ variant: 'destructive', title: 'Error al devolver item', description: e.message });
    }
  }, [firestore, toast]);
  
  const addMultiplePartsToOrder = useCallback(async (orderId: string, items: { itemId: string; quantity: number }[]) => {
    if (!firestore) return;
  
    for (const item of items) {
      const product = inventory.find((p) => p.id === item.itemId);
  
      if (!product) {
        toast({ variant: "destructive", title: "Error", description: `Producto con ID ${item.itemId} no encontrado.` });
        continue;
      }
      
      const isSale = orderId.startsWith('VTA-'); // This is a temporary way to differentiate
      const docRef = doc(firestore, isSale ? 'sales' : 'orders', orderId);

      if (product.isService) {
        const currentDoc = (isSale ? sales : orders).find((o) => o.id === orderId);
        if (!currentDoc) continue;
  
        const newPart: OrderPart = {
          itemId: product.id, name: product.name, quantity: item.quantity,
          unitPrice: product.sellingPrice, unitCost: 0, taxRate: product.taxRate, lotId: "SERVICE",
        };
        const updatedParts = [...currentDoc.items, newPart];
        
        if (isSale) {
            const { subtotal, taxTotal, total } = updatedParts.reduce((acc, part) => {
                const partSubtotal = part.unitPrice * part.quantity;
                const partTax = partSubtotal * (part.taxRate / 100);
                acc.subtotal += partSubtotal;
                acc.taxTotal += partTax;
                acc.total += partSubtotal + partTax;
                return acc;
            }, { subtotal: 0, taxTotal: 0, total: 0 });
            await updateDoc(docRef, { items: updatedParts, subtotal, taxTotal, total });
        } else {
             await updateDoc(docRef, { parts: updatedParts });
        }

        toast({ title: "Servicio Añadido", description: `${item.quantity} x ${product.name} añadido(s).` });

      } else {
        const lotsCollectionRef = collection(firestore, `inventory/${item.itemId}/stockLots`);
        const lotsQuery = query(lotsCollectionRef, where("quantity", ">", 0), orderBy("createdAt", "asc"));
        
        try {
            const lotsSnapshot = await getDocs(lotsQuery);

            const lotsToConsume = [];
            let quantityNeeded = item.quantity;

            for (const lotDoc of lotsSnapshot.docs) {
                if (quantityNeeded <= 0) break;
                const lotData = lotDoc.data() as StockLot;
                const consume = Math.min(quantityNeeded, lotData.quantity);
                lotsToConsume.push({ ref: lotDoc.ref, consume, data: lotData });
                quantityNeeded -= consume;
            }

            if (quantityNeeded > 0) {
                throw new Error(`Stock insuficiente para ${product.name}. Se necesitan ${item.quantity}, pero solo hay ${product.stock} disponibles.`);
            }
            
            await runTransaction(firestore, async (transaction) => {
                const currentDoc = await transaction.get(docRef);
                if (!currentDoc.exists()) throw new Error("El documento no existe.");
                
                const currentData = currentDoc.data() as Order | Sale;
                const newParts: OrderPart[] = [];

                for (const lotToUpdate of lotsToConsume) {
                    const lotDoc = await transaction.get(lotToUpdate.ref);
                    const currentLot = lotDoc.data() as StockLot;

                    if (!lotDoc.exists() || currentLot.quantity < lotToUpdate.consume) {
                        throw new Error(`El stock del lote para ${product.name} cambió. Por favor, inténtalo de nuevo.`);
                    }

                    newParts.push({
                        itemId: item.itemId, name: product.name, quantity: lotToUpdate.consume,
                        unitPrice: product.sellingPrice, unitCost: lotToUpdate.data.costPrice, taxRate: product.taxRate, lotId: lotToUpdate.ref.id,
                    });
                    transaction.update(lotToUpdate.ref, { quantity: currentLot.quantity - lotToUpdate.consume });
                }
                
                const updatedItems = [...currentData.items, ...newParts];
                if (isSale) {
                     const { subtotal, taxTotal, total } = updatedItems.reduce((acc, part) => {
                        const partSubtotal = part.unitPrice * part.quantity;
                        const partTax = partSubtotal * (part.taxRate / 100);
                        acc.subtotal += partSubtotal;
                        acc.taxTotal += partTax;
                        acc.total += partSubtotal + partTax;
                        return acc;
                    }, { subtotal: 0, taxTotal: 0, total: 0 });
                    transaction.update(docRef, { items: updatedItems, subtotal, taxTotal, total });
                } else {
                     transaction.update(docRef, { parts: updatedItems });
                }
            });

            toast({ title: "Parte(s) Añadida(s)", description: `${item.quantity} x ${product.name} añadido(s).` });

        } catch (e: any) {
            console.error("Transaction failed: ", e);
            toast({ variant: "destructive", title: "Error al añadir parte", description: e.message });
        }
      }
    }
  }, [firestore, inventory, orders, sales, toast]);
  
  const removePartFromOrder = useCallback(async (orderId: string, partToRemove: OrderPart) => {
    if (!firestore) return;
    const { itemId, lotId, quantity } = partToRemove;

    const product = inventory.find(p => p.id === itemId);
    const orderRef = doc(firestore, "orders", orderId);
    const currentOrder = orders.find(o => o.id === orderId);

    if (!currentOrder) return;

    const partIndex = currentOrder.parts.findIndex(
      (p) => p.itemId === itemId && p.lotId === lotId && p.quantity === quantity
    );

    if (partIndex === -1) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar la parte para eliminar.' });
        return;
    }
    
    const updatedParts = [
        ...currentOrder.parts.slice(0, partIndex),
        ...currentOrder.parts.slice(partIndex + 1),
    ];

    if (!product || product.isService || lotId === 'SERVICE') {
        updateDocumentNonBlocking(orderRef, { parts: updatedParts });
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const lotRef = doc(firestore, `inventory/${itemId}/stockLots`, lotId);

            const lotDoc = await transaction.get(lotRef);

            if (lotDoc.exists()) {
                const currentLot = lotDoc.data() as StockLot;
                transaction.update(lotRef, { quantity: currentLot.quantity + quantity });
            } else {
                 const newLot: Omit<StockLot, 'id' | 'createdAt'> = {
                    purchaseId: `RETURN-ORD-${orderId}`,
                    purchaseDate: new Date().toISOString(),
                    quantity: quantity,
                    costPrice: partToRemove.unitCost,
                    notes: `Devolución de Orden #${orderId}`,
                    originalPurchaseDate: partToRemove.lotId 
                };
                 transaction.set(lotRef, {...newLot, createdAt: serverTimestamp()});
            }
            transaction.update(orderRef, { parts: updatedParts });
        });
        toast({ title: 'Parte Devuelta', description: 'La parte ha sido devuelta al inventario.' });
    } catch (e: any) {
        console.error("Return transaction failed: ", e);
        toast({ variant: 'destructive', title: "Error al devolver parte", description: e.message });
    }
  }, [firestore, inventory, orders, toast]);

  const seedDatabase = useCallback(async () => {
    if (!firestore || !user) {
        throw new Error("Firestore is not available or user is not authenticated.");
    }
    
    const collectionsToClear = ['clients', 'suppliers', 'inventory', 'orders', 'stockEntries', 'expenses', 'sales'];
    
    for (const collectionName of collectionsToClear) {
        const collectionRef = collection(firestore, collectionName);
        const snapshot = await getDocs(query(collectionRef));
        
        if (snapshot.empty) continue;
        
        const chunks: any[][] = [];
        for (let i = 0; i < snapshot.docs.length; i += 500) {
            chunks.push(snapshot.docs.slice(i, i + 500));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(firestore);
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        
        if (collectionName === 'inventory') {
            for (const invDoc of snapshot.docs) {
                const lotsRef = collection(firestore, `inventory/${invDoc.id}/stockLots`);
                const lotsSnapshot = await getDocs(query(lotsRef));
                if (lotsSnapshot.empty) continue;

                const lotChunks: any[][] = [];
                 for (let i = 0; i < lotsSnapshot.docs.length; i += 500) {
                    lotChunks.push(lotsSnapshot.docs.slice(i, i + 500));
                }

                for (const lotChunk of lotChunks) {
                    const subBatch = writeBatch(firestore);
                    lotChunk.forEach(lotDoc => subBatch.delete(lotDoc.ref));
                    await subBatch.commit();
                }
            }
        }
    }

    const mainSeedBatch = writeBatch(firestore);
    const clientDocs: any = {};
    seedClients.forEach(c => {
        const docRef = doc(collection(firestore, 'clients'));
        clientDocs[c.email] = docRef.id;
        mainSeedBatch.set(docRef, {...c, id: docRef.id});
    });

    const supplierDocs: any = {};
    seedSuppliers.forEach(s => {
        const docRef = doc(collection(firestore, 'suppliers'));
        supplierDocs[s.name] = docRef.id;
        mainSeedBatch.set(docRef, {...s, id: docRef.id});
    });

    const inventoryDocs: any = {};
    seedInventory.forEach(i => {
        const docRef = doc(collection(firestore, 'inventory'));
        inventoryDocs[i.sku] = docRef.id;
        mainSeedBatch.set(docRef, {...i, id: docRef.id});
    });
    
    await mainSeedBatch.commit();

    const stockEntriesWithIds = seedStockEntries.map(entry => {
        return {
            ...entry,
            supplierId: supplierDocs[entry.supplierName],
            items: entry.items.map((item: any) => ({
                ...item,
                itemId: inventoryDocs[item.sku],
            })),
        }
    });

    for(const entry of stockEntriesWithIds) {
        await addStockEntry(entry);
    }
    
    toast({ title: "Datos de prueba cargados", description: "La base de datos ha sido poblada." });
  }, [firestore, user, addStockEntry, toast]);

  const migrateInventoryToLots = useCallback(async () => {
    if (!firestore) return;
    const productsToMigrate = inventory.filter(item => !item.isService && !item.lotsMigrated);

    if (productsToMigrate.length === 0) {
        toast({ title: "Migración no necesaria", description: "Todo el inventario ya utiliza el sistema de lotes." });
        return;
    }
    
    const chunks: InventoryItem[][] = [];
    for (let i = 0; i < productsToMigrate.length; i += 498) {
        chunks.push(productsToMigrate.slice(i, i + 498));
    }

    for (const chunk of chunks) {
        const batch = writeBatch(firestore);
        for (const product of chunk) {
            const productRef = doc(firestore, 'inventory', product.id);
            const lotsCollectionRef = collection(productRef, 'stockLots');

            const existingLotsSnapshot = await getDocs(query(lotsCollectionRef, where('purchaseId', '==', 'MIGRATION-INITIAL')));
            if (!existingLotsSnapshot.empty) {
                continue;
            }

            const lotRef = doc(lotsCollectionRef);
            
            const initialLot: Omit<StockLot, 'id'> = {
                purchaseId: 'MIGRATION-INITIAL',
                purchaseDate: new Date().toISOString(),
                createdAt: serverTimestamp(),
                quantity: product.stock,
                costPrice: product.costPrice,
                notes: 'Lote inicial creado desde inventario existente',
            };
            batch.set(lotRef, initialLot);
            batch.update(productRef, { lotsMigrated: true });
        }
        await batch.commit();
    }
    toast({ title: "Migración Exitosa", description: `${productsToMigrate.length} productos han sido migrados al sistema de lotes.`});
  }, [firestore, inventory, toast]);

  const value = {
    clients,
    suppliers,
    inventory,
    orders,
    sales,
    stockEntries,
    expenses,
    settings,
    isLoading,
    addClient,
    updateClient,
    deleteClient,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    addOrder,
    updateOrderStatus,
    updateOrderDetails,
    removePartFromOrder,
    addSale,
    updateSaleStatus,
    removeItemFromSale,
    addStockEntry,
    updateStockEntry,
    deleteStockEntry,
    addExpense,
    updateExpense,
    deleteExpense,
    addMultiplePartsToOrder,
    updateSettings,
    seedDatabase,
    migrateInventoryToLots,
    updateInventoryStock
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};

    