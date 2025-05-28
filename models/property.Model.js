const mongoose = require('mongoose');
const { Schema, model, models } = mongoose;

const PropertySchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['chalet', 'apartment', 'twin_villa', 'standalone_villa'], 
    required: true 
  },
  areaRange: { 
    type: String, 
    enum: ['less_than_100', '100_to_150', '150_to_200', 'over_200'], 
    required: true
  },
  priceRange: { 
    type: String, 
    enum: ['2_to_3_million', '3_to_4_million', '4_to_5_million', 'over_5_million'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['available', 'reserved', 'sold'], 
    default: 'available' 
  },
  images: [{ type: String }]
}, { timestamps: true });

PropertySchema.index({ projectId: 1, type: 1, areaRange: 1, priceRange: 1, status: 1 });

const PropertyModel = models.Property || model('Property', PropertySchema);

module.exports = { PropertyModel };
