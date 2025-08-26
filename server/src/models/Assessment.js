import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    roofArea: { type: Number, required: true },
    dwellers: { type: Number, required: true },
    openSpace: { type: Number, required: true },
    roofMaterial: { type: String },
    rainfall: { type: Number },
    groundwaterDepth: { type: Number },
    aquiferType: { type: String },
    potential: { type: Number },
    recommendedStructure: { type: String },
    dimensions: { type: Object },
    costEstimate: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Assessment = mongoose.model('Assessment', assessmentSchema);