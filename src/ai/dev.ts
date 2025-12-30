import { config } from 'dotenv';
config();

import '@/ai/flows/order-summary.ts';
import '@/ai/flows/ai-diagnosis-for-orders.ts';
import '@/ai/flows/extract-invoice-details.ts';
