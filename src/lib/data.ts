
import type { InventoryItem, Client, Supplier, Order, StockEntry } from './types';
import { PlaceHolderImages } from './placeholder-images';

// These are initial/fallback data and are not used when connected to Firebase.
// To seed the database, use the "Seed Database" feature in the Settings page.

export const clients: Client[] = [];
export const suppliers: Supplier[] = [];
export const inventory: InventoryItem[] = [];
export const orders: Order[] = [];
export const stockEntries: StockEntry[] = [];
