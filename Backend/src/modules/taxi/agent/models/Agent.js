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
    referredByAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxiAgent',
      default: null,
      index: true,
    },
    referralRewardPaid: {
      type: Boolean,
      default: false,
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
      pooling: {
        type: commissionRuleSchema,
        default: () => ({ enabled: true, type: 'percentage', value: 4 }),
      },
      entertainment: {
        type: commissionRuleSchema,
        default: () => ({ enabled: false, type: 'percentage', value: 0 }),
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
      referredAgentsCount: { type: Number, default: 0, min: 0 },
      agentReferralEarnings: { type: Number, default: 0, min: 0 },
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
    fcmTokenWeb: {
      type: String,
      default: '',
      trim: true,
    },
    fcmTokenMobile: {
      type: String,
      default: '',
      trim: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletion_reason: {
      type: String,
      default: '',
      trim: true,
    },
    deletionRequest: {
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
        index: true,
      },
      reason: { type: String, default: '', trim: true },
      requestedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
      adminNote: { type: String, default: '', trim: true },
    },
  },
  { timestamps: true },
);

agentSchema.index({ 'deletionRequest.status': 1, deletedAt: 1 });

export const Agent = mongoose.models.TaxiAgent || mongoose.model('TaxiAgent', agentSchema);
