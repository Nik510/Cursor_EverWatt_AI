import { z } from 'zod';

export const ThreePartyProgramSchema = z.object({
  id: z.string(),
  programName: z.string(),
  implementer: z.string(),
  utilities: z.array(z.string()),
  sectors: z.array(z.string()),
  programType: z.string(),
  scope: z.string(),
  description: z.string(),
  leadAdministrator: z.string().optional(),
  eligibleEquipment: z.array(z.string()).optional(),
  eligibleCustomers: z.string().optional(),
  incentiveStructure: z.string().optional(),
  incentiveRates: z.string().optional(),
  methodology: z.string().optional(),
  coordination: z.string().optional(),
  website: z.string().optional(),
  contactInfo: z.string().optional(),
  notes: z.array(z.string()).optional(),
  relatedPrograms: z.array(z.string()).optional(),
});

export const StructuredThreePartyProgramsSchema = z.object({
  programs: z.array(ThreePartyProgramSchema),
  metadata: z.object({
    totalPrograms: z.number(),
    utilities: z.array(z.string()),
    implementers: z.array(z.string()),
    sectors: z.array(z.string()),
    programTypes: z.array(z.string()),
  }),
});

export type StructuredThreePartyProgramsParsed = z.infer<typeof StructuredThreePartyProgramsSchema>;


