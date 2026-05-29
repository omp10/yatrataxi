import mongoose from 'mongoose';

const agentNeededDocumentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image_type: {
      type: String,
      enum: ['front_back', 'front', 'back', 'image'],
      default: 'front_back',
      trim: true,
    },
    has_expiry_date: {
      type: Boolean,
      default: false,
    },
    has_identify_number: {
      type: Boolean,
      default: false,
    },
    is_editable: {
      type: Boolean,
      default: false,
    },
    is_required: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

agentNeededDocumentSchema.index({ name: 1 });
agentNeededDocumentSchema.index({ active: 1, image_type: 1 });

export const AgentNeededDocument =
  mongoose.models.TaxiAgentNeededDocument || mongoose.model('TaxiAgentNeededDocument', agentNeededDocumentSchema);
