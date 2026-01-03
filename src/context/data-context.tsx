

"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { collection, doc, writeBatch, getDocs, query, serverTimestamp, runTransaction, where, orderBy, getDoc, DocumentReference, DocumentData, deleteDoc } from "firebase/firestore";
import type { InventoryItem, Client, Supplier, Order, StockEntry, OrderStatus, OrderPart, AppSettings, StockEntryItem, StockLot, Expense } from '@/lib/types';
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
  updateInventoryStock: (itemId: string, newStock: number) => Promise<void>;
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
  
  const clients = useMemo(() => clientsData || [], [clientsData]);
  const suppliers = useMemo(() => suppliersData || [], [suppliersData]);
  const orders = useMemo(() => ordersData || [], [ordersData]);
  const stockEntries = useMemo(() => stockEntriesData || [], [stockEntriesData]);
  const expenses = useMemo(() => expensesData || [], [expensesData]);

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
  const updateInventoryStock = async (itemId: string, newStock: number) => {
      updateDocumentNonBlocking(doc(firestore, 'inventory', itemId), { stock: newStock });
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
    
    const chunks: StockEntryItem[][] = [];
    for (let i = 0; i < entry.items.length; i += 498) {
        chunks.push(entry.items.slice(i, i + 498));
    }

    for (const chunk of chunks) {
        const batch = writeBatch(firestore);
        const stockEntryRef = doc(collection(firestore, 'stockEntries'));
        batch.set(stockEntryRef, {...entry, id: stockEntryRef.id, items: chunk});

        for (const item of chunk) {
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
        await batch.commit();
    }
  };

  const updateStockEntry = async (updatedEntry: StockEntry) => {
    toast({ variant: 'destructive', title: 'Función no implementada', description: 'La edición de compras con sistema FIFO debe hacerse manualmente para asegurar la integridad.' });
  };

  const deleteStockEntry = async (entryId: string) => {
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
          const productRef = doc(firestore, "inventory", item.itemId);
          const lotsQuery = query(
            collection(firestore, `inventory/${item.itemId}/stockLots`),
            where("purchaseId", "==", entryId)
          );

          const lotsSnapshot = await getDocs(lotsQuery);

          if (lotsSnapshot.empty) {
            // This might happen if migration happened but lots weren't created, or already deleted.
            // We can attempt a simple stock deduction, but it's risky. Better to warn.
            throw new Error(`No se encontró el lote de stock para ${item.name} de esta compra. No se puede revertir.`);
          }

          for (const lotDoc of lotsSnapshot.docs) {
            const lotData = lotDoc.data() as StockLot;

            // Important Safety Check:
            // Ensure the lot hasn't been partially used. If it has, abort the deletion.
            if (lotData.quantity < item.quantity) {
              throw new Error(`El stock de ${item.name} (Lote: ${lotDoc.id.slice(-4)}) ya fue utilizado en una orden. No se puede eliminar la compra.`);
            }

            // Read current product state
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw new Error(`El producto ${item.name} no existe en el inventario.`);
            }
            const currentProduct = productDoc.data() as InventoryItem;

            // Schedule writes
            transaction.delete(lotDoc.ref);
            transaction.update(productRef, { stock: currentProduct.stock - item.quantity });
          }
        }
        // Finally, delete the purchase entry itself
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
      const product = inventory.find((p) => p.id === item.itemId);
  
      if (!product) {
        toast({ variant: "destructive", title: "Error", description: `Producto con ID ${item.itemId} no encontrado.` });
        continue;
      }
  
      if (product.isService) {
        // Handle service items (no stock consumption)
        const orderRef = doc(firestore, "orders", orderId);
        const currentOrder = orders.find((o) => o.id === orderId);
        if (!currentOrder) continue;
  
        const newPart: OrderPart = {
          itemId: product.id,
          name: product.name,
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          unitCost: 0,
          taxRate: product.taxRate,
          lotId: "SERVICE",
        };
        const updatedParts = [...currentOrder.parts, newPart];
        updateDocumentNonBlocking(orderRef, { parts: updatedParts });
        toast({ title: "Servicio Añadido", description: `${item.quantity} x ${product.name} añadido(s) a la orden.` });
      } else {
        // Handle physical items (stock consumption)
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
                // Phase 1: Reads
                const orderRef = doc(firestore, "orders", orderId);
                const productRef = doc(firestore, "inventory", item.itemId);

                const docsToRead = [orderRef, productRef, ...lotsToConsume.map(l => l.ref)];
                const docsSnapshot = await Promise.all(docsToRead.map(ref => transaction.get(ref)));
                
                const currentOrderDoc = docsSnapshot[0];
                const currentProductDoc = docsSnapshot[1];
                const lotDocsInTransaction = docsSnapshot.slice(2);

                if (!currentOrderDoc.exists()) throw new Error("La orden no existe.");
                if (!currentProductDoc.exists()) throw new Error("El producto no existe.");

                // Phase 2: Logic and Writes
                const currentOrder = currentOrderDoc.data() as Order;
                const currentProduct = currentProductDoc.data() as InventoryItem;
                const newParts: OrderPart[] = [];
                let totalStockConsumed = 0;

                for (let i = 0; i < lotsToConsume.length; i++) {
                    const lotToUpdate = lotsToConsume[i];
                    const lotDoc = lotDocsInTransaction[i];
                    const currentLot = lotDoc.data() as StockLot;

                    if (!lotDoc.exists() || currentLot.quantity < lotToUpdate.consume) {
                        throw new Error(`El stock del lote para ${product.name} cambió. Por favor, inténtalo de nuevo.`);
                    }

                    newParts.push({
                        itemId: item.itemId,
                        name: product.name,
                        quantity: lotToUpdate.consume,
                        unitPrice: product.sellingPrice,
                        unitCost: lotToUpdate.data.costPrice,
                        taxRate: product.taxRate,
                        lotId: lotToUpdate.ref.id,
                    });
                    totalStockConsumed += lotToUpdate.consume;

                    // Write: Update Lot
                    transaction.update(lotToUpdate.ref, { quantity: currentLot.quantity - lotToUpdate.consume });
                }

                // Write: Update Order and Product
                transaction.update(orderRef, { parts: [...currentOrder.parts, ...newParts] });
                transaction.update(productRef, { stock: currentProduct.stock - totalStockConsumed });
            });

            toast({ title: "Parte(s) Añadida(s)", description: `${item.quantity} x ${product.name} añadido(s) a la orden.` });

        } catch (e: any) {
            console.error("Transaction failed: ", e);
            toast({ variant: "destructive", title: "Error al añadir parte", description: e.message });
        }
      }
    }
  };
  
  const removePartFromOrder = async (orderId: string, partToRemove: OrderPart) => {
    if (!firestore) return;
    const { itemId, lotId, quantity } = partToRemove;

    const product = inventory.find(p => p.id === itemId);
    const orderRef = doc(firestore, "orders", orderId);
    const currentOrder = orders.find(o => o.id === orderId);

    if (!currentOrder) return;

    // Find the specific index of the part to remove
    const partIndex = currentOrder.parts.findIndex(p => p.itemId === itemId && p.lotId === lotId);

    if (partIndex === -1) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar la parte para eliminar.' });
        return;
    }
    
    // Create new array by removing only the item at the found index
    const updatedParts = [
        ...currentOrder.parts.slice(0, partIndex),
        ...currentOrder.parts.slice(partIndex + 1),
    ];

    if (!product || product.isService || lotId === 'SERVICE') {
        // If it's a service or has no valid lot, just update the order parts array
        updateDocumentNonBlocking(orderRef, { parts: updatedParts });
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const productRef = doc(firestore, 'inventory', itemId);
            const lotRef = doc(firestore, `inventory/${itemId}/stockLots`, lotId);

            const lotDoc = await transaction.get(lotRef);
            const currentProductDoc = await transaction.get(productRef);

            if (!currentProductDoc.exists()) {
                throw new Error("El producto ya no existe.");
            }
            
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
                    originalPurchaseDate: partToRemove.lotId 
                };
                 transaction.set(lotRef, {...newLot, createdAt: serverTimestamp()});
            }

            // Update cached stock on product
            transaction.update(productRef, { stock: currentProduct.stock + quantity });

            // Update order with the precisely modified parts array
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
  };

  const migrateInventoryToLots = async () => {
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

            // Check if lots already exist for this product
            const existingLotsSnapshot = await getDocs(query(lotsCollectionRef, where('purchaseId', '==', 'MIGRATION-INITIAL')));
            if (!existingLotsSnapshot.empty) {
                continue; // Skip if initial lot already exists
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
  };
  // #endregion

  const value = {
    clients,
    suppliers,
    inventory,
    orders,
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

    

    






