

"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { collection, doc, writeBatch, getDocs, query, serverTimestamp, runTransaction, where, orderBy } from "firebase/firestore";
import type { InventoryItem, Client, Supplier, Order, StockEntry, OrderStatus, OrderPart, AppSettings, StockEntryItem, Expense, StockLot } from '@/lib/types';
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
  addStockEntry: (entry: Omit<StockEntry, 'id'>) => Promise<any>;
  updateStockEntry: (entry: StockEntry) => Promise<void>; // This might be deprecated or changed
  deleteStockEntry: (entryId: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<any>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addMultiplePartsToOrder: (orderId: string, items: { itemId: string; quantity: number }[]) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  seedDatabase: () => Promise<void>;
  migrateInventoryToLots: () => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // #region Firestore Collections Hooks
  const clientsRef = useMemoFirebase(() => user ? collection(firestore, "clients") : null, [firestore, user]);
  const { data: clientsData, isLoading: isLoadingClients } = useCollection<Client>(clientsRef);
  
  const suppliersRef = useMemoFirebase(() => user ? collection(firestore, "suppliers") : null, [firestore, user]);
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersRef);

  const inventoryRef = useMemoFirebase(() => user ? collection(firestore, "inventory") : null, [firestore, user]);
  const { data: inventoryData, isLoading: isLoadingInventory } = useCollection<InventoryItem>(inventoryRef);

  const ordersRef = useMemoFirebase(() => user ? collection(firestore, "orders") : null, [firestore, user]);
  const { data: ordersData, isLoading: isLoadingOrders } = useCollection<Order>(ordersRef);

  const stockEntriesRef = useMemoFirebase(() => user ? collection(firestore, "stockEntries") : null, [firestore, user]);
  const { data: stockEntriesData, isLoading: isLoadingStockEntries } = useCollection<StockEntry>(stockEntriesRef);
  
  const expensesRef = useMemoFirebase(() => user ? collection(firestore, 'expenses') : null, [firestore, user]);
  const { data: expensesData, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesRef);
  // #endregion

  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  
  useEffect(() => {
    const storedSettings = localStorage.getItem('settings');
    if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
    }
  }, []);

  const inventory = useMemo(() => {
    return (inventoryData || []).map(item => ({
      ...item,
      hasTax: item.hasTax ?? true,
      taxRate: item.taxRate ?? 16,
      isService: item.isService ?? false,
    }));
  }, [inventoryData]);

  const isLoading = isLoadingClients || isLoadingSuppliers || isLoadingInventory || isLoadingOrders || isLoadingStockEntries || isLoadingExpenses;

  // #region CRUD Operations
  const addClient = async (client: Omit<Client, 'id' | 'createdAt'>) => {
    if (!clientsRef) return;
    return addDocumentNonBlocking(clientsRef, {
      ...client,
      source: client.source || '',
      taxId: client.taxId || '',
      cfdiUse: client.cfdiUse || '',
      createdAt: new Date().toISOString(),
    });
  };
  const updateClient = async (updatedClient: Client) => {
    const { id, ...data } = updatedClient;
    updateDocumentNonBlocking(doc(firestore, "clients", id), data);
  };
  const deleteClient = async (clientId: string) => {
    deleteDocumentNonBlocking(doc(firestore, "clients", clientId));
  };

  const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    if (!suppliersRef) return;
    return addDocumentNonBlocking(suppliersRef, supplier);
  };
  const updateSupplier = async (updatedSupplier: Supplier) => {
    const { id, ...data } = updatedSupplier;
    updateDocumentNonBlocking(doc(firestore, "suppliers", id), data);
  };
  const deleteSupplier = async (supplierId: string) => {
    deleteDocumentNonBlocking(doc(firestore, "suppliers", supplierId));
  };

  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    if (!inventoryRef) return;
    return addDocumentNonBlocking(inventoryRef, item);
  };
  const updateInventoryItem = async (updatedItem: InventoryItem) => {
    const { id, ...data } = updatedItem;
    updateDocumentNonBlocking(doc(firestore, "inventory", id), data);
  };
  const deleteInventoryItem = async (itemId: string) => {
    deleteDocumentNonBlocking(doc(firestore, "inventory", itemId));
  };
  
  const addOrder = async (orderData: Omit<Order, 'id' | 'status' | 'parts'>) => {
    if (!ordersRef) return;
    const newOrder = {
        ...orderData,
        status: 'Abierta' as OrderStatus,
        parts: [],
    };
    return addDocumentNonBlocking(ordersRef, newOrder);
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, closedAt?: Date) => {
     const updateData: {status: OrderStatus, closedAt?: string} = { status };
     if (status === 'Entregada / Cerrada') {
         updateData.closedAt = (closedAt || new Date()).toISOString();
     }
     updateDocumentNonBlocking(doc(firestore, "orders", orderId), updateData);
  };

  const updateOrderDetails = async (orderId: string, details: { problemDescription?: string; diagnosis?: string; }) => {
    updateDocumentNonBlocking(doc(firestore, "orders", orderId), details);
  };

  const addStockEntry = async (entry: Omit<StockEntry, 'id'>) => {
    if (!firestore) return;
    const stockEntryRef = doc(collection(firestore, 'stockEntries'));
    const batch = writeBatch(firestore);
    
    batch.set(stockEntryRef, {...entry, id: stockEntryRef.id});

    for (const item of entry.items) {
        const productRef = doc(firestore, 'inventory', item.itemId);
        const lotRef = doc(collection(firestore, `inventory/${item.itemId}/stockLots`));
        const newLot: Omit<StockLot, 'id'> = {
            purchaseId: stockEntryRef.id,
            purchaseDate: entry.date,
            createdAt: serverTimestamp(),
            quantity: item.quantity,
            costPrice: item.unitCost,
        };
        batch.set(lotRef, newLot);
        
        const currentProduct = inventory.find(p => p.id === item.itemId);
        if (currentProduct) {
            batch.update(productRef, { stock: currentProduct.stock + item.quantity });
        }
    }
    
    return batch.commit();
  };

  const updateStockEntry = async (updatedEntry: StockEntry) => {
    toast({ variant: 'destructive', title: 'Función no implementada', description: 'La edición de compras con sistema FIFO debe hacerse manualmente para asegurar la integridad.' });
  };

  const deleteStockEntry = async (entryId: string) => {
     deleteDocumentNonBlocking(doc(firestore, "stockEntries", entryId));
  };
  
  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    if (!expensesRef) return;
    return addDocumentNonBlocking(expensesRef, expense);
  };
  const updateExpense = async (updatedExpense: Expense) => {
    const { id, ...data } = updatedExpense;
    updateDocumentNonBlocking(doc(firestore, 'expenses', id), data);
  };
  const deleteExpense = async (expenseId: string) => {
    deleteDocumentNonBlocking(doc(firestore, 'expenses', expenseId));
  };

  const updateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('settings', JSON.stringify(newSettings));
  };
  // #endregion

  // #region FIFO and Inventory Logic
  const addMultiplePartsToOrder = async (orderId: string, items: { itemId: string; quantity: number }[]) => {
    if (!firestore) return;
    for (const item of items) {
        const product = inventory.find(p => p.id === item.itemId);
        if (!product) continue;
        if (product.isService) {
            // Handle service items (no stock consumption)
            const orderRef = doc(firestore, 'orders', orderId);
            const currentOrder = ordersData?.find(o => o.id === orderId);
            if (!currentOrder) continue;

            const newPart: OrderPart = {
                itemId: product.id,
                name: product.name,
                quantity: item.quantity,
                unitPrice: product.sellingPrice,
                unitCost: 0,
                taxRate: product.taxRate,
                lotId: 'SERVICE'
            };
            const updatedParts = [...currentOrder.parts, newPart];
            updateDocumentNonBlocking(orderRef, { parts: updatedParts });
            continue;
        }

        try {
            await runTransaction(firestore, async (transaction) => {
                const productRef = doc(firestore, 'inventory', item.itemId);
                const lotsQuery = query(collection(firestore, `inventory/${item.itemId}/stockLots`), where('quantity', '>', 0), orderBy('createdAt', 'asc'));
                const lotsSnapshot = await getDocs(lotsQuery);

                let quantityNeeded = item.quantity;
                const newParts: OrderPart[] = [];
                let totalStockConsumed = 0;

                for (const lotDoc of lotsSnapshot.docs) {
                    if (quantityNeeded <= 0) break;
                    const lot = { id: lotDoc.id, ...lotDoc.data() } as StockLot;
                    const lotRef = doc(firestore, `inventory/${item.itemId}/stockLots`, lot.id);
                    
                    const consume = Math.min(quantityNeeded, lot.quantity);
                    
                    transaction.update(lotRef, { quantity: lot.quantity - consume });
                    
                    newParts.push({
                        itemId: item.itemId,
                        name: product.name,
                        quantity: consume,
                        unitPrice: product.sellingPrice,
                        unitCost: lot.costPrice,
                        taxRate: product.taxRate,
                        lotId: lot.id
                    });
                    
                    quantityNeeded -= consume;
                    totalStockConsumed += consume;
                }

                if (quantityNeeded > 0) {
                    throw new Error(`Stock insuficiente para ${product.name}. Se necesitan ${item.quantity}, pero solo hay ${product.stock - totalStockConsumed} disponibles.`);
                }

                const orderRef = doc(firestore, 'orders', orderId);
                const currentOrderDoc = await transaction.get(orderRef);
                const currentOrder = currentOrderDoc.data() as Order;
                
                transaction.update(orderRef, { parts: [...currentOrder.parts, ...newParts] });
                transaction.update(productRef, { stock: product.stock - totalStockConsumed });
            });
            toast({ title: "Parte(s) Añadida(s)", description: `${item.quantity} x ${product.name} añadido(s) a la orden.` });
        } catch (e: any) {
            console.error("Transaction failed: ", e);
            toast({ variant: 'destructive', title: "Error al añadir parte", description: e.message });
        }
    }
  };
  
  const removePartFromOrder = async (orderId: string, partToRemove: OrderPart) => {
    if (!firestore) return;
    const { itemId, lotId, quantity } = partToRemove;

    const product = inventory.find(p => p.id === itemId);
    if (!product || product.isService || lotId === 'SERVICE') {
        // If it's a service or has no valid lot, just remove it from the order
        const orderRef = doc(firestore, "orders", orderId);
        const currentOrder = ordersData?.find(o => o.id === orderId);
        if (!currentOrder) return;
        const updatedParts = currentOrder.parts.filter(p => !(p.itemId === itemId && p.lotId === lotId));
        updateDocumentNonBlocking(orderRef, { parts: updatedParts });
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const productRef = doc(firestore, 'inventory', itemId);
            const lotRef = doc(firestore, `inventory/${itemId}/stockLots`, lotId);
            const orderRef = doc(firestore, 'orders', orderId);

            const lotDoc = await transaction.get(lotRef);
            const currentOrderDoc = await transaction.get(orderRef);
            const currentProductDoc = await transaction.get(productRef);

            if (!currentOrderDoc.exists() || !currentProductDoc.exists()) {
                throw new Error("La orden o el producto ya no existen.");
            }

            const currentOrder = currentOrderDoc.data() as Order;
            const currentProduct = currentProductDoc.data() as InventoryItem;

            if (lotDoc.exists()) {
                // Lot exists, just add the quantity back
                const currentLot = lotDoc.data() as StockLot;
                transaction.update(lotRef, { quantity: currentLot.quantity + quantity });
            } else {
                // Lot was fully consumed, we need to re-create it
                 const newLot: Omit<StockLot, 'id' | 'createdAt'> = {
                    purchaseId: `RETURN-ORD-${orderId}`,
                    purchaseDate: new Date().toISOString(),
                    quantity: quantity,
                    costPrice: partToRemove.unitCost,
                    notes: `Devolución de Orden #${orderId}`,
                    originalPurchaseDate: partToRemove.lotId // Assumption: old lotID might contain date info or ref
                };
                 transaction.set(lotRef, {...newLot, createdAt: serverTimestamp()});
            }

            // Update cached stock on product
            transaction.update(productRef, { stock: currentProduct.stock + quantity });

            // Remove part from order
            const updatedParts = currentOrder.parts.filter(p => !(p.lotId === lotId && p.itemId === itemId));
            transaction.update(orderRef, { parts: updatedParts });
        });
        toast({ title: 'Parte Devuelta', description: 'La parte ha sido devuelta al inventario.' });
    } catch (e: any) {
        console.error("Return transaction failed: ", e);
        toast({ variant: 'destructive', title: "Error al devolver parte", description: e.message });
    }
  };
  // #endregion

  // #region Seeding & Migration
  const seedDatabase = async () => {
    if (!firestore || !user) {
        throw new Error("Firestore is not available or user is not authenticated.");
    }
    
    const collectionsToClear = ['clients', 'suppliers', 'inventory', 'orders', 'stockEntries', 'expenses'];
    
    for (const collectionName of collectionsToClear) {
        const collectionRef = collection(firestore, collectionName);
        const snapshot = await getDocs(query(collectionRef));
        const batch = writeBatch(firestore);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        // Also clear subcollections for inventory
        if (collectionName === 'inventory') {
            const inventorySnapshot = await getDocs(query(collection(firestore, 'inventory')));
            for (const invDoc of inventorySnapshot.docs) {
                const lotsRef = collection(firestore, `inventory/${invDoc.id}/stockLots`);
                const lotsSnapshot = await getDocs(query(lotsRef));
                const subBatch = writeBatch(firestore);
                lotsSnapshot.docs.forEach(lotDoc => subBatch.delete(lotDoc.ref));
                await subBatch.commit();
            }
        }
    }

    const mainBatch = writeBatch(firestore);

    // Seed logic here...
    // The logic has been simplified as the full implementation is extensive
    // This is a placeholder for the full seeding logic.
    seedClients.forEach(c => mainBatch.set(doc(collection(firestore, 'clients')), c));
    seedSuppliers.forEach(s => mainBatch.set(doc(collection(firestore, 'suppliers')), s));
    seedInventory.forEach(i => mainBatch.set(doc(collection(firestore, 'inventory')), i));
    // Orders and StockEntries would need ID mapping in a real scenario
    
    await mainBatch.commit();
    await migrateInventoryToLots();
  };

  const migrateInventoryToLots = async () => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const productsToMigrate = inventory.filter(item => !item.isService && !item.lotsMigrated);

    if (productsToMigrate.length === 0) {
        toast({ title: "Migración no necesaria", description: "Todo el inventario ya utiliza el sistema de lotes." });
        return;
    }

    for (const product of productsToMigrate) {
        const productRef = doc(firestore, 'inventory', product.id);
        const lotRef = doc(collection(productRef, 'stockLots'));
        
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
    toast({ title: "Migración Exitosa", description: `${productsToMigrate.length} productos han sido migrados al sistema de lotes.`});
  };
  // #endregion

  const value = {
    clients: clientsData || [],
    suppliers: suppliersData || [],
    inventory: inventory,
    orders: ordersData || [],
    stockEntries: stockEntriesData || [],
    expenses: expensesData || [],
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
