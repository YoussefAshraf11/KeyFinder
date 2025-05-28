const mongoose = require('mongoose');
const { Schema, model, models } = mongoose;

const FeedbackSchema = new Schema({
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
  brokerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  status: { 
    type: String, 
    enum: ['liked', 'not_liked'], 
    required: true 
  },
  reservationMade: { type: Boolean, default: false }
}, { timestamps: true });

FeedbackSchema.index({ appointmentId: 1, brokerId: 1, propertyId: 1 });

const FeedbackModel = models.Feedback || model('Feedback', FeedbackSchema);

module.exports = { FeedbackModel };
