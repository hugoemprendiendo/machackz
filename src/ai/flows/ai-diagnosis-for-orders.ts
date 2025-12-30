'use server';

/**
 * @fileOverview AI-powered diagnosis flow for repair orders.
 *
 * - generateDiagnosis - A function that generates an initial problem diagnosis.
 * - DiagnosisInput - The input type for the generateDiagnosis function.
 * - DiagnosisOutput - The return type for the generateDiagnosis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DiagnosisInputSchema = z.object({
  deviceType: z.string().describe('The type of device (e.g., Laptop, Celular).'),
  deviceModel: z.string().describe('The specific model of the device.'),
  problemDescription: z.string().describe('The customer reported problem description.'),
});
export type DiagnosisInput = z.infer<typeof DiagnosisInputSchema>;

const DiagnosisOutputSchema = z.object({
  diagnosis: z.string().describe('The AI-generated initial diagnosis of the problem.'),
});
export type DiagnosisOutput = z.infer<typeof DiagnosisOutputSchema>;

export async function generateDiagnosis(input: DiagnosisInput): Promise<DiagnosisOutput> {
  return diagnosisFlow(input);
}

const diagnosisPrompt = ai.definePrompt({
  name: 'diagnosisPrompt',
  input: {schema: DiagnosisInputSchema},
  output: {schema: DiagnosisOutputSchema},
  prompt: `You are an expert technician specializing in diagnosing computer and electronic device issues. A customer has reported the following problem with their device.

Device Type: {{{deviceType}}}
Device Model: {{{deviceModel}}}
Problem Description: {{{problemDescription}}}

Based on this information, provide an initial diagnosis of the problem. Be specific and suggest potential causes or faulty components.
`,
});

const diagnosisFlow = ai.defineFlow(
  {
    name: 'diagnosisFlow',
    inputSchema: DiagnosisInputSchema,
    outputSchema: DiagnosisOutputSchema,
  },
  async input => {
    const {output} = await diagnosisPrompt(input);
    return output!;
  }
);
