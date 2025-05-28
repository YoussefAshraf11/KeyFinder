const mongoose = require('mongoose');
const { Schema, models, model } = mongoose;

const ProjectSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  developer: { type: String }
}, { timestamps: true });

ProjectSchema.index({ location: '2dsphere' });

const ProjectModel = models.Project || model('Project', ProjectSchema);

module.exports = { ProjectModel };
