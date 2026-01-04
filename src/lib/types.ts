

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  sku: string;
  // costPrice is now deprecated in favor of lots, but kept for migration
  costPrice: number; 
  sellingPrice: number;
  stock: number; // This will now be a cached/calculated value
  minStock: number;
  hasTax: boolean;
  taxRate: number;
  isService: boolean;
  lotsMigrated?: boolean; // Flag for idempotency
};

export type StockLot = {
    id: string; // Document ID of the lot
    purchaseId: string;
    purchaseDate: string; // ISO String date of the purchase
    createdAt: any; // Firestore Server Timestamp for FIFO ordering
    quantity: number; // Quantity remaining in this lot
    costPrice: number; // Cost for this specific lot
    notes?: string; // E.g. "Devolución de Orden #ORD-123"
    originalPurchaseDate?: string; // For returned lots
}

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId?: string;
  cfdiUse?: string;
  notes?: string;
  source?: string;
  createdAt: string;
};

export type SupplierCategory = 'Proveedor Directo' | 'Marketplace';

export type Supplier = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  taxId: string;
  category?: SupplierCategory;
  marketplaceName?: string;
};

export type OrderStatus =
  | 'Abierta'
  | 'En Progreso'
  | 'Esperando Piezas'
  | 'Listo para Entrega'
  | 'Entregada / Cerrada'
  | 'Cancelada';

export type SaleStatus = 'Borrador' | 'Completada' | 'Cancelada';

export type OrderPart = {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number; // The actual cost of the unit sold (from its lot)
  taxRate: number;
  lotId: string; // Traceability back to the stock lot
};

export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  contactInfo: string;
  deviceType: string;
  brand: string;
  deviceModel: string;
  serialNumber?: string;
  hdd?: string;
  ram?: string;
  screws?: number;
  batterySerial?: string;
  batteryCycles?: number;
  hasCharger: boolean;
  condition?: string;
  problemDescription: string;
  diagnosis: string;
  missingParts?: boolean;
  notes?: string;
  status: OrderStatus;
  createdAt: string;
  closedAt?: string;
  parts: OrderPart[];
};

export type Sale = {
    id: string;
    customerId: string;
    customerName: string;
    createdAt: string;
    items: OrderPart[];
    status: SaleStatus;
    total: number;
    subtotal: number;
    taxTotal: number;
    notes?: string;
}

export type StockEntryItem = {
  itemId: string;
  name: string; // denormalized for display
  quantity: number;
  unitCost: number;
  taxRate: number;
  hasTax: boolean;
};

export type StockEntry = {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  date: string;
  totalCost: number;
  items: StockEntryItem[];
};

export type Expense = {
    id: string;
    description: string;
    category: string;
    supplierId: string;
    supplierName: string;
    invoiceNumber?: string;
    date: string;
    totalAmount: number;
    notes?: string;
};

export type AppSettings = {
  receptionNotes: string;
  deliveryNotes: string;
};
