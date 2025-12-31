
'use server';
/**
 * @fileOverview Extracts structured data from an invoice image or XML file.
 *
 * - extractInvoiceDetails - A function that analyzes an invoice and returns its details.
 * - InvoiceDetailsInput - The input type for the extractInvoiceDetails function.
 * - InvoiceDetailsOutput - The return type for the extractInvoiceDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InvoiceDetailsInputSchema = z.object({
  invoiceData: z
    .string()
    .describe(
      "The invoice data, which can be either a data URI for an image (e.g., 'data:image/png;base64,...') or a PDF."
    ),
  contentType: z.string().describe("The MIME type of the invoice data (e.g., 'image/png' or 'application/pdf')."),
});
export type InvoiceDetailsInput = z.infer<typeof InvoiceDetailsInputSchema>;

const InvoiceDetailsOutputSchema = z.object({
  invoiceNumber: z.string().optional().describe('The unique invoice number or ID.'),
  date: z.string().optional().describe('The date of the invoice in YYYY-MM-DD format.'),
  headers: z.array(z.string()).describe('The detected headers for the line items table. You must provide all detected headers.'),
  rows: z.array(z.array(z.string())).describe('The data rows for the line items, matching the headers.'),
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
Analyze the following invoice document.
Extract the invoice number and the date.
Then, extract all the line items as a table. Provide all the detected column headers and then all the data rows.
The date should be formatted as YYYY-MM-DD.

Invoice Data:
{{media url=invoiceData contentType=contentType}}
`,
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
