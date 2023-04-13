import { z } from "zod";

export const SalesOrderSchema = z.object({
  altShippingCost: z.number(),
  billingAddress: z.object({
    addr1: z.string(),
    addr2: z.string().optional(),
    addressee: z.string(),
    addrPhone: z.string().optional(),
    city: z.string(),
    country: z.object({ id: z.string() }),
    state: z.string(),
    zip: z.string(),
  }),
  department: z.object({ id: z.string() }),
  email: z.string(),
  entity: z.object({
    id: z.string(),
  }),
  item: z.object({
    items: z.array(
      z.object({
        amount: z.number().optional(),
        commitInventory: z
          .object({
            id: z.string(),
          })
          .optional(),
        costEstimate: z.number().optional(),
        costEstimateRate: z.number().optional(),
        costEstimateType: z
          .object({
            id: z.string(),
          })
          .optional(),
        createPo: z
          .object({
            id: z.string(),
          })
          .optional(),
        description: z.string().optional(),
        item: z.object({ id: z.string() }),
        itemType: z.object({ id: z.string() }),
        line: z.number(),
        marginal: z.boolean().optional(),
        poRate: z.number().optional(),
        poVendor: z.object({ id: z.string() }).optional(),
        price: z.object({ id: z.string() }).optional(),
        quantity: z.number().optional(),
        rate: z.number().optional(),
      })
    ),
  }),
  leadSource: z.object({ id: z.string() }).optional(),
  nexus: z.object({ id: z.string() }),
  salesEffectiveDate: z.string(),
  salesRep: z.object({ id: z.string() }),
  shipComplete: z.boolean(),
  shipIsResidential: z.boolean(),
  shipMethod: z.object({ id: z.string() }),
  shipOverride: z.boolean(),
  shippingAddress: z.object({
    addr1: z.string(),
    addr2: z.string().optional(),
    addressee: z.string(),
    addrPhone: z.string().optional(),
    city: z.string(),
    country: z.object({ id: z.string() }),
    state: z.string(),
    zip: z.string(),
  }),
  shippingCost: z.number(),
  shippingCostOverridden: z.boolean(),
  subsidiary: z.object({ id: z.string() }),
  taxDetailsOverride: z.boolean(),
  taxPointDate: z.string(),
  taxRegOverride: z.boolean(),
  tranDate: z.string(),
  updateDropshipOrderQty: z.string(),
});