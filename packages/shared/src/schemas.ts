import { z } from "zod";
import {
  USER_ROLES,
  LOAD_STATUSES,
  EQUIPMENT_TYPES,
  DOCUMENT_TYPES,
  INVOICE_STATUSES,
  PAYMENT_STATUSES,
  DRIVER_STATUSES,
  DQ_DOCUMENT_TYPES,
  SETTLEMENT_STATUSES,
} from "./constants.js";

export const userRoleSchema = z.enum(USER_ROLES);
export const loadStatusSchema = z.enum(LOAD_STATUSES);
export const equipmentTypeSchema = z.enum(EQUIPMENT_TYPES);
export const documentTypeSchema = z.enum(DOCUMENT_TYPES);
export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const driverStatusSchema = z.enum(DRIVER_STATUSES);
export const dqDocumentTypeSchema = z.enum(DQ_DOCUMENT_TYPES);
export const settlementStatusSchema = z.enum(SETTLEMENT_STATUSES);

export const emailSchema = z.string().trim().toLowerCase().email();
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\-\s().]{7,20}$/, "Invalid phone number");
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

// Decimal-on-the-wire helper. DB stores money as `decimal`, which Postgres returns
// as strings. Inputs accept either number or numeric string.
export const decimalSchema = z
  .union([z.string().regex(/^-?\d+(\.\d+)?$/), z.number().finite()])
  .transform((v) => (typeof v === "number" ? v.toFixed(2) : v));

// ----- Auth -----

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: userRoleSchema,
  companyName: z.string().trim().min(1).max(256).optional(),
  contactName: z.string().trim().min(1).max(256).optional(),
  phone: phoneSchema.optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

// ----- Loads -----

export const createLoadSchema = z.object({
  shipperId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  originCity: z.string().min(1).max(128),
  originState: z.string().length(2),
  destinationCity: z.string().min(1).max(128),
  destinationState: z.string().length(2),
  pickupDate: z.string().datetime(),
  deliveryDate: z.string().datetime().optional(),
  equipmentType: z.string().min(1).max(64),
  weightLbs: z.number().int().positive().max(200_000).optional(),
  commodity: z.string().max(256).optional(),
  specialInstructions: z.string().max(4000).optional(),
  referenceNumber: z.string().max(64).optional(),
  distanceMiles: z.number().int().positive().optional(),
  shipperRate: decimalSchema.optional(),
  carrierRate: decimalSchema.optional(),
  internalNotes: z.string().max(4000).optional(),
});
export type CreateLoadInput = z.infer<typeof createLoadSchema>;

export const updateLoadSchema = createLoadSchema.partial().extend({
  status: loadStatusSchema.optional(),
});
export type UpdateLoadInput = z.infer<typeof updateLoadSchema>;

export const loadFiltersSchema = z.object({
  status: loadStatusSchema.optional(),
  equipmentType: z.string().max(64).optional(),
  originState: z.string().length(2).optional(),
  destinationState: z.string().length(2).optional(),
  pickupAfter: z.string().datetime().optional(),
  pickupBefore: z.string().datetime().optional(),
  shipperId: z.string().uuid().optional(),
  carrierId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  search: z.string().max(128).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type LoadFilters = z.infer<typeof loadFiltersSchema>;

// ----- Carriers -----

export const carrierOnboardingSchema = z.object({
  mcNumber: z.string().max(32).optional(),
  dotNumber: z.string().max(32).optional(),
  authorityStatus: z.string().max(64).optional(),
  authoritySince: z.string().datetime().optional(),
  insuranceExpiry: z.string().datetime().optional(),
  safetyRating: z.string().max(32).optional(),
  equipmentTypes: z.array(z.string().min(1).max(64)).default([]),
  preferredOriginStates: z.array(z.string().length(2)).default([]),
  preferredDestStates: z.array(z.string().length(2)).default([]),
  factoringPartner: z.string().max(128).optional(),
  factoringAccount: z.string().max(128).optional(),
  bankRouting: z.string().max(64).optional(),
  bankAccount: z.string().max(64).optional(),
  onboardingStep: z.number().int().min(1).max(10).optional(),
  onboardingComplete: z.boolean().optional(),
});
export type CarrierOnboardingInput = z.infer<typeof carrierOnboardingSchema>;

// ----- Tracking -----

export const trackingEventSchema = z.object({
  loadId: z.string().uuid(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  statusUpdate: z.string().max(256).optional(),
  source: z.string().max(64).optional(),
  timestamp: z.string().datetime().optional(),
});
export type TrackingEventInput = z.infer<typeof trackingEventSchema>;

// ----- Push subscriptions -----

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

// ----- Pagination -----

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// ----- Invoices / payments -----

export const createInvoiceSchema = z.object({
  loadId: z.string().uuid(),
  amount: decimalSchema,
  dueAt: z.string().datetime().optional(),
  factoringPartner: z.string().max(128).optional(),
  factoringNotes: z.string().max(2000).optional(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// ----- Drivers -----

export const createDriverSchema = z.object({
  name: z.string().min(1).max(256),
  cdlNumber: z.string().max(64).optional(),
  cdlState: z.string().length(2).optional(),
  cdlExpiry: z.string().datetime().optional(),
  medicalCardExpiry: z.string().datetime().optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  hireDate: z.string().datetime().optional(),
  status: driverStatusSchema.default("active"),
});
export type CreateDriverInput = z.infer<typeof createDriverSchema>;

export const updateDriverSchema = createDriverSchema.partial();
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;

// ----- Trucks -----

export const createTruckSchema = z.object({
  unitNumber: z.string().max(64).optional(),
  vin: z.string().max(64).optional(),
  plate: z.string().max(32).optional(),
  plateState: z.string().length(2).optional(),
  year: z.number().int().min(1980).max(2100).optional(),
  make: z.string().max(64).optional(),
  model: z.string().max(64).optional(),
  type: z.string().max(64).optional(),
  insuranceExpiry: z.string().datetime().optional(),
  registrationExpiry: z.string().datetime().optional(),
});
export type CreateTruckInput = z.infer<typeof createTruckSchema>;

// ----- Load assignment -----

export const assignLoadSchema = z.object({
  driverId: z.string().uuid(),
  truckId: z.string().uuid(),
});
export type AssignLoadInput = z.infer<typeof assignLoadSchema>;

// ----- DQ documents -----

export const dqDocumentRecordSchema = z.object({
  type: dqDocumentTypeSchema,
  r2Key: z.string().min(1),
  filename: z.string().min(1).max(256),
  expiryDate: z.string().datetime().optional(),
});
export type DqDocumentRecordInput = z.infer<typeof dqDocumentRecordSchema>;

// ----- Settlements -----

export const settlementGenerateSchema = z.object({
  brokerFee: decimalSchema.optional(),
});
export type SettlementGenerateInput = z.infer<typeof settlementGenerateSchema>;

export const settlementFactorSchema = z.object({
  partner: z.string().min(1).max(128),
  notes: z.string().max(2000).optional(),
});
export type SettlementFactorInput = z.infer<typeof settlementFactorSchema>;
