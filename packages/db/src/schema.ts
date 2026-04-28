import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  pgEnum,
  json,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "agent", "shipper", "carrier"]);
export const loadStatusEnum = pgEnum("load_status", [
  "draft",
  "posted",
  "booked",
  "in_transit",
  "delivered",
  "invoiced",
  "paid",
  "cancelled",
]);
export const documentTypeEnum = pgEnum("document_type", [
  "BOL",
  "POD",
  "rate_con",
  "invoice",
  "COI",
  "carrier_agreement",
  "W9",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "pending",
  "approved",
  "paid",
  "factoring_submitted",
  "void",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "paid",
  "failed",
]);

export const driverStatusEnum = pgEnum("driver_status", [
  "active",
  "inactive",
  "terminated",
]);

export const dqDocumentTypeEnum = pgEnum("dq_document_type", [
  "CDL",
  "medical_card",
  "MVR",
  "drug_test",
  "road_test",
  "employment_app",
  "annual_review",
  "PSP_report",
]);

export const settlementStatusEnum = pgEnum("settlement_status", [
  "pending",
  "generated",
  "factoring_submitted",
  "paid",
]);

export const shipperLeadStatusEnum = pgEnum("shipper_lead_status", [
  "new",
  "contacted",
  "qualified",
  "signed",
  "lost",
]);

export const dedicatedLaneStatusEnum = pgEnum("dedicated_lane_status", [
  "requested",
  "approved",
  "active",
  "completed",
  "cancelled",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  companyName: text("company_name"),
  contactName: text("contact_name"),
  phone: text("phone"),
  emailVerified: boolean("email_verified").default(false),
  emailVerifyToken: text("email_verify_token"),
  refreshToken: text("refresh_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const carriers = pgTable("carriers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  mcNumber: text("mc_number"),
  dotNumber: text("dot_number"),
  authorityStatus: text("authority_status"),
  authoritySince: timestamp("authority_since"),
  insuranceExpiry: timestamp("insurance_expiry"),
  safetyRating: text("safety_rating"),
  outOfServicePct: decimal("out_of_service_pct"),
  equipmentTypes: json("equipment_types").$type<string[]>().default([]),
  preferredOriginStates: json("preferred_origin_states").$type<string[]>().default([]),
  preferredDestStates: json("preferred_dest_states").$type<string[]>().default([]),
  highwayVerified: boolean("highway_verified").default(false),
  highwayVerificationId: text("highway_verification_id"),
  onboardingStep: integer("onboarding_step").default(1),
  onboardingComplete: boolean("onboarding_complete").default(false),
  doNotUse: boolean("do_not_use").default(false),
  doNotUseReason: text("do_not_use_reason"),
  bankRoutingEncrypted: text("bank_routing_encrypted"),
  bankAccountEncrypted: text("bank_account_encrypted"),
  factoringPartner: text("factoring_partner"),
  factoringAccount: text("factoring_account"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shippers = pgTable("shippers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  billingAddress: text("billing_address"),
  paymentTerms: integer("payment_terms").default(30),
  creditLimit: decimal("credit_limit").default("50000"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  territory: text("territory"),
  commissionRate: decimal("commission_rate").default("0.65"),
  totalEarned: decimal("total_earned").default("0"),
  loadsCovered: integer("loads_covered").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const loads = pgTable("loads", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipperId: uuid("shipper_id").references(() => shippers.id).notNull(),
  agentId: uuid("agent_id").references(() => agents.id),
  carrierId: uuid("carrier_id").references(() => carriers.id),
  originCity: text("origin_city").notNull(),
  originState: text("origin_state").notNull(),
  destinationCity: text("destination_city").notNull(),
  destinationState: text("destination_state").notNull(),
  pickupDate: timestamp("pickup_date").notNull(),
  deliveryDate: timestamp("delivery_date"),
  equipmentType: text("equipment_type").notNull(),
  weightLbs: integer("weight_lbs"),
  commodity: text("commodity"),
  specialInstructions: text("special_instructions"),
  referenceNumber: text("reference_number"),
  distanceMiles: integer("distance_miles"),
  shipperRate: decimal("shipper_rate"),
  carrierRate: decimal("carrier_rate"),
  brokerMargin: decimal("broker_margin"),
  brokerMarginPct: decimal("broker_margin_pct"),
  datPosted: boolean("dat_posted").default(false),
  datPostingId: text("dat_posting_id"),
  trackingLinkToken: uuid("tracking_link_token").defaultRandom(),
  status: loadStatusEnum("status").default("draft"),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rateConfirmations = pgTable("rate_confirmations", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").references(() => loads.id).notNull(),
  carrierId: uuid("carrier_id").references(() => carriers.id).notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  twoFaCode: text("two_fa_code"),
  twoFaVerified: boolean("two_fa_verified").default(false),
  pdfR2Key: text("pdf_r2_key"),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").references(() => loads.id),
  carrierId: uuid("carrier_id").references(() => carriers.id),
  type: documentTypeEnum("type").notNull(),
  r2Key: text("r2_key").notNull(),
  filename: text("filename").notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").references(() => loads.id).notNull(),
  shipperId: uuid("shipper_id").references(() => shippers.id).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  amount: decimal("amount").notNull(),
  status: invoiceStatusEnum("status").default("pending"),
  pdfR2Key: text("pdf_r2_key"),
  issuedAt: timestamp("issued_at").defaultNow(),
  dueAt: timestamp("due_at"),
  paidAt: timestamp("paid_at"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  factoringSubmitted: boolean("factoring_submitted").default(false),
  factoringPartner: text("factoring_partner"),
  factoringNotes: text("factoring_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const carrierPayments = pgTable("carrier_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").references(() => loads.id).notNull(),
  carrierId: uuid("carrier_id").references(() => carriers.id).notNull(),
  amount: decimal("amount").notNull(),
  status: paymentStatusEnum("status").default("pending"),
  method: text("method"),
  paidAt: timestamp("paid_at"),
  factoringUsed: boolean("factoring_used").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentCommissions = pgTable("agent_commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").references(() => loads.id).notNull(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  grossMargin: decimal("gross_margin").notNull(),
  commissionRate: decimal("commission_rate").notNull(),
  commissionAmount: decimal("commission_amount").notNull(),
  status: paymentStatusEnum("status").default("pending"),
  paidAt: timestamp("paid_at"),
});

export const trackingEvents = pgTable("tracking_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").references(() => loads.id).notNull(),
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  statusUpdate: text("status_update"),
  source: text("source").default("carrier_app"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  carrierId: uuid("carrier_id").references(() => carriers.id).notNull(),
  name: text("name").notNull(),
  cdlNumber: text("cdl_number"),
  cdlState: text("cdl_state"),
  cdlExpiry: timestamp("cdl_expiry"),
  medicalCardExpiry: timestamp("medical_card_expiry"),
  phone: text("phone"),
  email: text("email"),
  hireDate: timestamp("hire_date"),
  status: driverStatusEnum("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trucks = pgTable("trucks", {
  id: uuid("id").primaryKey().defaultRandom(),
  carrierId: uuid("carrier_id").references(() => carriers.id).notNull(),
  unitNumber: text("unit_number"),
  vin: text("vin"),
  plate: text("plate"),
  plateState: text("plate_state"),
  year: integer("year"),
  make: text("make"),
  model: text("model"),
  type: text("type"),
  insuranceExpiry: timestamp("insurance_expiry"),
  registrationExpiry: timestamp("registration_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loadAssignments = pgTable("load_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").references(() => loads.id).notNull(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  truckId: uuid("truck_id").references(() => trucks.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: uuid("assigned_by").references(() => users.id),
});

export const dqDocuments = pgTable("dq_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => drivers.id).notNull(),
  carrierId: uuid("carrier_id").references(() => carriers.id).notNull(),
  type: dqDocumentTypeEnum("type").notNull(),
  r2Key: text("r2_key").notNull(),
  filename: text("filename").notNull(),
  expiryDate: timestamp("expiry_date"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  verifiedByAdmin: boolean("verified_by_admin").default(false),
});

export const settlements = pgTable("settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").references(() => loads.id).notNull(),
  carrierId: uuid("carrier_id").references(() => carriers.id).notNull(),
  grossAmount: decimal("gross_amount").notNull(),
  brokerFee: decimal("broker_fee").default("0"),
  netAmount: decimal("net_amount").notNull(),
  pdfR2Key: text("pdf_r2_key"),
  status: settlementStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shipperLeads = pgTable("shipper_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  originCity: text("origin_city"),
  originState: text("origin_state"),
  destCity: text("dest_city"),
  destState: text("dest_state"),
  equipmentType: text("equipment_type"),
  frequency: text("frequency"), // spot | weekly | monthly | dedicated
  weight: integer("weight"),
  companyName: text("company_name"),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  estimatedRate: decimal("estimated_rate"),
  assignedAgentId: uuid("assigned_agent_id").references(() => agents.id),
  status: shipperLeadStatusEnum("status").default("new"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dedicatedLanes = pgTable("dedicated_lanes", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipperId: uuid("shipper_id").references(() => shippers.id).notNull(),
  agentId: uuid("agent_id").references(() => agents.id),
  originState: text("origin_state").notNull(),
  destState: text("dest_state").notNull(),
  equipmentType: text("equipment_type").notNull(),
  weeklyVolume: integer("weekly_volume"),
  lockedRate: decimal("locked_rate"),
  carrierRate: decimal("carrier_rate"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: dedicatedLaneStatusEnum("status").default("requested"),
  agreementPdfR2Key: text("agreement_pdf_r2_key"),
  signedByShipperAt: timestamp("signed_by_shipper_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const networkStats = pgTable("network_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  totalCarriers: integer("total_carriers").default(0),
  statesCovered: integer("states_covered").default(0),
  loadsThisMonth: integer("loads_this_month").default(0),
  onTimeRate: decimal("on_time_rate").default("0"),
  pctHighwayVerified: decimal("pct_highway_verified").default("0"),
  avgAuthorityYears: decimal("avg_authority_years").default("0"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

export const aiRateSuggestions = pgTable("ai_rate_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  loadId: uuid("load_id").references(() => loads.id),
  suggestedShipperRate: decimal("suggested_shipper_rate"),
  suggestedCarrierRate: decimal("suggested_carrier_rate"),
  suggestedMarginPct: decimal("suggested_margin_pct"),
  acceptedByUser: boolean("accepted_by_user"),
  finalShipperRate: decimal("final_shipper_rate"),
  rationale: text("rationale"),
  createdAt: timestamp("created_at").defaultNow(),
});
