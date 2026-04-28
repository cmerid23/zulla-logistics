import type {
  UserRole,
  LoadStatus,
  DocumentType,
  InvoiceStatus,
  PaymentStatus,
  NotificationChannel,
  DriverStatus,
  DqDocumentType,
  SettlementStatus,
} from "./constants.js";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  companyName?: string | null;
  contactName?: string | null;
  phone?: string | null;
  emailVerified?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

// Money fields on the wire match the DB's decimal columns: serialized as strings.
// Components use `formatMoneyDecimal` to render.
export interface Load {
  id: string;
  shipperId: string;
  agentId?: string | null;
  carrierId?: string | null;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  pickupDate: string;
  deliveryDate?: string | null;
  equipmentType: string;
  weightLbs?: number | null;
  commodity?: string | null;
  specialInstructions?: string | null;
  referenceNumber?: string | null;
  distanceMiles?: number | null;
  shipperRate?: string | null;
  carrierRate?: string | null;
  brokerMargin?: string | null;
  brokerMarginPct?: string | null;
  datPosted?: boolean;
  datPostingId?: string | null;
  trackingLinkToken?: string | null;
  status: LoadStatus;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Carrier {
  id: string;
  userId: string;
  mcNumber?: string | null;
  dotNumber?: string | null;
  authorityStatus?: string | null;
  authoritySince?: string | null;
  insuranceExpiry?: string | null;
  safetyRating?: string | null;
  outOfServicePct?: string | null;
  equipmentTypes?: string[] | null;
  preferredOriginStates?: string[] | null;
  preferredDestStates?: string[] | null;
  highwayVerified?: boolean;
  highwayVerificationId?: string | null;
  onboardingStep?: number;
  onboardingComplete?: boolean;
  doNotUse?: boolean;
  doNotUseReason?: string | null;
  factoringPartner?: string | null;
  factoringAccount?: string | null;
}

export interface Shipper {
  id: string;
  userId: string;
  companyName: string;
  contactName?: string | null;
  phone?: string | null;
  billingAddress?: string | null;
  paymentTerms?: number | null;
  creditLimit?: string | null;
}

export interface Agent {
  id: string;
  userId: string;
  territory?: string | null;
  commissionRate?: string | null;
  totalEarned?: string | null;
  loadsCovered?: number | null;
  active?: boolean;
}

export interface DocumentRecord {
  id: string;
  loadId?: string | null;
  carrierId?: string | null;
  type: DocumentType;
  r2Key: string;
  filename: string;
  fileSizeBytes?: number | null;
  uploadedByUserId?: string | null;
  uploadedAt: string;
  url?: string;
}

export interface Invoice {
  id: string;
  loadId: string;
  shipperId: string;
  invoiceNumber: string;
  amount: string;
  status: InvoiceStatus;
  pdfR2Key?: string | null;
  issuedAt?: string | null;
  dueAt?: string | null;
  paidAt?: string | null;
  stripePaymentIntentId?: string | null;
  factoringSubmitted?: boolean;
  factoringPartner?: string | null;
  factoringNotes?: string | null;
  createdAt: string;
}

export interface CarrierPayment {
  id: string;
  loadId: string;
  carrierId: string;
  amount: string;
  status: PaymentStatus;
  method?: string | null;
  paidAt?: string | null;
  factoringUsed?: boolean;
  notes?: string | null;
}

export interface AgentCommission {
  id: string;
  loadId: string;
  agentId: string;
  grossMargin: string;
  commissionRate: string;
  commissionAmount: string;
  status: PaymentStatus;
  paidAt?: string | null;
}

export interface TrackingEvent {
  id: string;
  loadId: string;
  latitude?: string | null;
  longitude?: string | null;
  statusUpdate?: string | null;
  source?: string | null;
  timestamp: string;
}

export interface AiRateSuggestion {
  id: string;
  loadId?: string | null;
  suggestedShipperRate?: string | null;
  suggestedCarrierRate?: string | null;
  suggestedMarginPct?: string | null;
  acceptedByUser?: boolean | null;
  finalShipperRate?: string | null;
  rationale?: string | null;
  createdAt: string;
}

export interface Driver {
  id: string;
  carrierId: string;
  name: string;
  cdlNumber?: string | null;
  cdlState?: string | null;
  cdlExpiry?: string | null;
  medicalCardExpiry?: string | null;
  phone?: string | null;
  email?: string | null;
  hireDate?: string | null;
  status: DriverStatus;
  createdAt: string;
}

export interface Truck {
  id: string;
  carrierId: string;
  unitNumber?: string | null;
  vin?: string | null;
  plate?: string | null;
  plateState?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  type?: string | null;
  insuranceExpiry?: string | null;
  registrationExpiry?: string | null;
  createdAt: string;
}

export interface LoadAssignment {
  id: string;
  loadId: string;
  driverId: string;
  truckId: string;
  assignedAt: string;
  assignedBy?: string | null;
}

export interface DqDocument {
  id: string;
  driverId: string;
  carrierId: string;
  type: DqDocumentType;
  r2Key: string;
  filename: string;
  expiryDate?: string | null;
  uploadedAt: string;
  verifiedByAdmin: boolean;
}

export interface Settlement {
  id: string;
  loadId: string;
  carrierId: string;
  grossAmount: string;
  brokerFee: string;
  netAmount: string;
  pdfR2Key?: string | null;
  status: SettlementStatus;
  createdAt: string;
}

export interface Notification {
  id: string;
  channel: NotificationChannel;
  subject?: string | null;
  body: string;
  readAt?: string | null;
  createdAt: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };
