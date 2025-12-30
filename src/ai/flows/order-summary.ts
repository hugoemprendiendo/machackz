'use server';

/**
 * @fileOverview Generates a summary of an order's details including description, diagnosis, and parts used.
 *
 * - generateOrderSummary - A function that generates the order summary.
 * - OrderSummaryInput - The input type for the generateOrderSummary function.
 * - OrderSummaryOutput - The return type for the generateOrderSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OrderSummaryInputSchema = z.object({
  description: z.string().describe('The description of the problem reported by the customer.'),
  diagnosis: z.string().describe('The diagnosis of the problem by the technician.'),
  parts: z.array(
    z.object({
      name: z.string().describe('The name of the part used.'),
      quantity: z.number().describe('The quantity of the part used.'),
    })
  ).describe('A list of parts used in the repair.'),
});
export type OrderSummaryInput = z.infer<typeof OrderSummaryInputSchema>;

const OrderSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the order details.'),
});
export type OrderSummaryOutput = z.infer<typeof OrderSummaryOutputSchema>;

export async function generateOrderSummary(input: OrderSummaryInput): Promise<OrderSummaryOutput> {
  return orderSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'orderSummaryPrompt',
  input: {schema: OrderSummaryInputSchema},
  output: {schema: OrderSummaryOutputSchema},
  prompt: `You are an AI assistant that generates a concise summary of a repair order.

  Given the following information about the order, generate a summary that includes the problem description, diagnosis, and parts used:

  Problem Description: {{{description}}}
  Diagnosis: {{{diagnosis}}}
  Parts Used:
  {{#each parts}}
  - {{{quantity}}} x {{{name}}}
  {{/each}}
  `,
});

const orderSummaryFlow = ai.defineFlow(
  {
    name: 'orderSummaryFlow',
    inputSchema: OrderSummaryInputSchema,
    outputSchema: OrderSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
