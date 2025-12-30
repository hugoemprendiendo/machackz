'use server';
/**
 * @fileOverview Extracts structured data from an invoice image.
 *
 * - extractInvoiceDetails - A function that analyzes an invoice image and returns its details.
 * - InvoiceDetailsInput - The input type for the extractInvoiceDetails function.
 * - InvoiceDetailsOutput - The return type for the extractInvoiceDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InvoiceDetailsInputSchema = z.object({
  invoiceImageDataUri: z
    .string()
    .describe(
      "An image of an invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type InvoiceDetailsInput = z.infer<typeof InvoiceDetailsInputSchema>;

const InvoiceDetailsOutputSchema = z.object({
  supplierName: z.string().describe('The name of the supplier or vendor.'),
  invoiceNumber: z.string().describe('The unique invoice number or ID.'),
  date: z.string().describe('The date of the invoice in YYYY-MM-DD format.'),
  items: z.array(
    z.object({
      name: z.string().describe('The name or description of the item.'),
      quantity: z.number().describe('The quantity of the item purchased.'),
      unitCost: z.number().describe('The cost or price per unit of the item.'),
    })
  ).describe('A list of all items purchased.'),
});
export type InvoiceDetailsOutput = z.infer<typeof InvoiceDetailsOutputSchema>;

export async function extractInvoiceDetails(input: InvoiceDetailsInput): Promise<InvoiceDetailsOutput> {
  return extractInvoiceDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractInvoiceDetailsPrompt',
  input: {schema: InvoiceDetailsInputSchema},
  output: {schema: InvoiceDetailsOutputSchema},
  prompt: `You are an expert at extracting structured data from documents.
Analyze the following invoice image and extract the supplier's name, the invoice number, the date, and a list of all line items.
For each line item, provide its name/description, quantity, and the unit cost/price.
The date should be formatted as YYYY-MM-DD.

Invoice Image: {{media url=invoiceImageDataUri}}`,
});

const extractInvoiceDetailsFlow = ai.defineFlow(
  {
    name: 'extractInvoiceDetailsFlow',
    inputSchema: InvoiceDetailsInputSchema,
    outputSchema: InvoiceDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
