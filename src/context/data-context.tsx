
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { collection, doc, writeBatch, getDocs, query } from "firebase/firestore";
import type { InventoryItem, Client, Supplier, Order, StockEntry, OrderStatus, OrderPart, AppSettings, StockEntryItem, Expense } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { seedClients, seedSuppliers, seedInventory, seedOrders, seedStockEntries } from '@/lib/seed-data';

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
  addClient: (client: Omit<Client, 'id'>) => Promise<any>;
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
  updateOrderParts: (orderId: string, parts: OrderPart[]) => Promise<void>;
  addStockEntry: (entry: Omit<StockEntry, 'id'>) => Promise<any>;
  updateStockEntry: (entry: StockEntry) => Promise<void>;
  deleteStockEntry: (entryId: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<any>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  updateInventoryStock: (itemId: string, newStock: number) => Promise<void>;
  addPartToOrder: (orderId: string, part: OrderPart) => Promise<void>;
  addMultiplePartsToOrder: (orderId: string, parts: OrderPart[]) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  seedDatabase: () => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const firestore = useFirestore();
  const { user } = useUser();

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

  const addClient = async (client: Omit<Client, 'id'>) => {
    if (!clientsRef) return;
    return addDocumentNonBlocking(clientsRef, client);
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

  const updateOrderParts = async (orderId: string, parts: OrderPart[]) => {
    updateDocumentNonBlocking(doc(firestore, "orders", orderId), { parts });
  };
  
  const addStockEntry = async (entry: Omit<StockEntry, 'id'>) => {
     if (!stockEntriesRef) return;
    return addDocumentNonBlocking(stockEntriesRef, entry);
  };

  const updateStockEntry = async (updatedEntry: StockEntry) => {
    const { id, ...data } = updatedEntry;
    updateDocumentNonBlocking(doc(firestore, "stockEntries", id), data);
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

  const updateInventoryStock = async (itemId: string, newStock: number) => {
    updateDocumentNonBlocking(doc(firestore, "inventory", itemId), { stock: newStock });
  };
  
  const addPartToOrder = async (orderId: string, part: OrderPart) => {
    const orderRef = doc(firestore, "orders", orderId);
    const currentOrder = ordersData?.find(o => o.id === orderId);
    if (!currentOrder) return;

    const existingPartIndex = currentOrder.parts.findIndex(p => p.itemId === part.itemId);
    let updatedParts: OrderPart[];

    if (existingPartIndex > -1) {
        updatedParts = [...currentOrder.parts];
        updatedParts[existingPartIndex].quantity += part.quantity;
    } else {
        updatedParts = [...currentOrder.parts, part];
    }
    updateDocumentNonBlocking(orderRef, { parts: updatedParts });
  };

  const addMultiplePartsToOrder = async (orderId: string, partsToAdd: OrderPart[]) => {
    const orderRef = doc(firestore, 'orders', orderId);
    const currentOrder = ordersData?.find(o => o.id === orderId);
    if (!currentOrder) return;

    // Create a mutable copy of the current parts
    const updatedParts: OrderPart[] = [...currentOrder.parts];

    partsToAdd.forEach(part => {
      const existingPartIndex = updatedParts.findIndex(p => p.itemId === part.itemId);

      if (existingPartIndex > -1) {
        // If part exists, update its quantity
        updatedParts[existingPartIndex] = {
          ...updatedParts[existingPartIndex],
          quantity: updatedParts[existingPartIndex].quantity + part.quantity,
        };
      } else {
        // If part is new, add it to the array
        updatedParts.push(part);
      }
    });

    // Perform a single update with the final array
    updateDocumentNonBlocking(orderRef, { parts: updatedParts });
  };

  const updateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('settings', JSON.stringify(newSettings));
  };

  const seedDatabase = async () => {
    if (!firestore || !user) {
        throw new Error("Firestore is not available or user is not authenticated.");
    }
    
    const collectionsToClear = ['clients', 'suppliers', 'inventory', 'orders', 'stockEntries', 'expenses'];

    const batch = writeBatch(firestore);

    // 1. Clear existing data
    for (const collectionName of collectionsToClear) {
      const collectionRef = collection(firestore, collectionName);
      const q = query(collectionRef);
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    // 2. Add new data and build ID maps
    const clientIdMap = new Map<string, string>();
    for (const client of seedClients) {
      const docRef = doc(collection(firestore, 'clients'));
      batch.set(docRef, client);
      // Map old ID to new Firestore ID
      clientIdMap.set(`cli-${(seedClients.indexOf(client) + 1).toString().padStart(3, '0')}`, docRef.id);
    }
    
    const supplierIdMap = new Map<string, string>();
    for (const supplier of seedSuppliers) {
      const docRef = doc(collection(firestore, 'suppliers'));
      batch.set(docRef, supplier);
      supplierIdMap.set(`sup-${(seedSuppliers.indexOf(supplier) + 1).toString().padStart(3, '0')}`, docRef.id);
    }

    const inventoryIdMap = new Map<string, string>();
    for (const item of seedInventory) {
      const docRef = doc(collection(firestore, 'inventory'));
      batch.set(docRef, item);
      inventoryIdMap.set(`inv-${(seedInventory.indexOf(item) + 1).toString().padStart(3, '0')}`, docRef.id);
    }

    // 3. Add relational data (orders, stock entries) using the new IDs
    for (const order of seedOrders) {
      const docRef = doc(collection(firestore, 'orders'));
      const newCustomerId = clientIdMap.get(order.customerId);
      if (!newCustomerId) continue;

      const newParts = order.parts.map((p: any) => ({
        ...p,
        itemId: inventoryIdMap.get(p.itemId) || p.itemId,
      }));
      
      batch.set(docRef, { ...order, customerId: newCustomerId, parts: newParts });
    }

    for (const entry of seedStockEntries) {
        const docRef = doc(collection(firestore, 'stockEntries'));
        const newSupplierId = supplierIdMap.get(entry.supplierId);
        if (!newSupplierId) continue;

        const newItems = entry.items.map((i: any) => ({
            ...i,
            itemId: inventoryIdMap.get(i.itemId) || i.itemId,
        }));
        const totalCost = newItems.reduce((sum: number, item: any) => {
            const product = seedInventory.find(p => `inv-${(seedInventory.indexOf(p) + 1).toString().padStart(3, '0')}` === item.itemId)
            const itemCost = (item.quantity || 0) * (item.unitCost || 0);
            let tax = 0;
            if (product?.hasTax) {
                tax = itemCost * ((product.taxRate || 0) / 100);
            }
            return sum + itemCost + tax;
        }, 0);

        batch.set(docRef, { ...entry, supplierId: newSupplierId, items: newItems, totalCost });
    }

    await batch.commit();
  };

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
    updateOrderParts,
    addStockEntry,
    updateStockEntry,
    deleteStockEntry,
    addExpense,
    updateExpense,
    deleteExpense,
    updateInventoryStock,
    addPartToOrder,
    addMultiplePartsToOrder,
    updateSettings,
    seedDatabase,
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
