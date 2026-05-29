import mongoose from 'mongoose';

const commissionRuleSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const agentDocumentEntrySchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: '',
      trim: true,
    },
    side: {
      type: String,
      default: 'single',
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: null,
    },
    documentNumber: {
      type: String,
      default: '',
      trim: true,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const agentSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    countryCode: {
      type: String,
      default: '+91',
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 5,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    profileImage: {
      type: String,
      default: '',
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    referralCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      index: true,
    },
    commissionConfig: {
      directRide: {
        type: commissionRuleSchema,
        default: () => ({ enabled: true, type: 'percentage', value: 5 }),
      },
      referredRide: {
        type: commissionRuleSchema,
        default: () => ({ enabled: true, type: 'percentage', value: 3 }),
      },
      intercity: {
        type: commissionRuleSchema,
        default: () => ({ enabled: true, type: 'percentage', value: 6 }),
      },
      bus: {
        type: commissionRuleSchema,
        default: () => ({ enabled: true, type: 'percentage', value: 4 }),
      },
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    payout: {
      bankName: { type: String, default: '', trim: true },
      accountHolder: { type: String, default: '', trim: true },
      accountNumber: { type: String, default: '', trim: true },
      ifscCode: { type: String, default: '', trim: true },
      upiId: { type: String, default: '', trim: true },
    },
    metrics: {
      directRideBookings: { type: Number, default: 0, min: 0 },
      referredRideBookings: { type: Number, default: 0, min: 0 },
      directBusBookings: { type: Number, default: 0, min: 0 },
      referredBusBookings: { type: Number, default: 0, min: 0 },
      totalCustomers: { type: Number, default: 0, min: 0 },
      totalEarnings: { type: Number, default: 0, min: 0 },
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    documents: {
      type: Map,
      of: agentDocumentEntrySchema,
      default: () => ({}),
    },
    onboarding: {
      submittedAt: {
        type: Date,
        default: null,
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
      reviewNote: {
        type: String,
        default: '',
        trim: true,
      },
    },
  },
  { timestamps: true },
);

export const Agent = mongoose.models.TaxiAgent || mongoose.model('TaxiAgent', agentSchema);
