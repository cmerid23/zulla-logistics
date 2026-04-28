// Mirrors the pgEnum values in packages/db/src/schema.ts.
// Keep in sync with the schema — these are the single source of truth on the client.

export const USER_ROLES = ["admin", "agent", "shipper", "carrier"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const LOAD_STATUSES = [
  "draft",
  "posted",
  "booked",
  "in_transit",
  "delivered",
  "invoiced",
  "paid",
  "cancelled",
] as const;
export type LoadStatus = (typeof LOAD_STATUSES)[number];

export const DOCUMENT_TYPES = [
  "BOL",
  "POD",
  "rate_con",
  "invoice",
  "COI",
  "carrier_agreement",
  "W9",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const INVOICE_STATUSES = [
  "pending",
  "approved",
  "paid",
  "factoring_submitted",
  "void",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "processing", "paid", "failed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DRIVER_STATUSES = ["active", "inactive", "terminated"] as const;
export type DriverStatus = (typeof DRIVER_STATUSES)[number];

export const DQ_DOCUMENT_TYPES = [
  "CDL",
  "medical_card",
  "MVR",
  "drug_test",
  "road_test",
  "employment_app",
  "annual_review",
  "PSP_report",
] as const;
export type DqDocumentType = (typeof DQ_DOCUMENT_TYPES)[number];

export const DQ_DOCUMENT_LABEL: Record<DqDocumentType, string> = {
  CDL: "CDL",
  medical_card: "Medical Card",
  MVR: "MVR",
  drug_test: "Drug Test",
  road_test: "Road Test",
  employment_app: "Employment App",
  annual_review: "Annual Review",
  PSP_report: "PSP Report",
};

export const SETTLEMENT_STATUSES = [
  "pending",
  "generated",
  "factoring_submitted",
  "paid",
] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

// Equipment is stored as free text on loads/carriers, but the UI picks from this list.
export const EQUIPMENT_TYPES = [
  "van",
  "reefer",
  "flatbed",
  "step_deck",
  "double_drop",
  "rgn",
  "power_only",
  "hotshot",
  "tanker",
  "container",
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const EQUIPMENT_LABEL: Record<EquipmentType, string> = {
  van: "Dry Van",
  reefer: "Reefer",
  flatbed: "Flatbed",
  step_deck: "Step Deck",
  double_drop: "Double Drop",
  rgn: "RGN",
  power_only: "Power Only",
  hotshot: "Hotshot",
  tanker: "Tanker",
  container: "Container",
};

export const NOTIFICATION_CHANNELS = ["email", "sms", "push", "in_app"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;
export type USState = (typeof US_STATES)[number];

export const API_BASE_PATH = "/api";

export const PAGINATION_DEFAULTS = {
  page: 1,
  pageSize: 25,
  maxPageSize: 100,
} as const;
