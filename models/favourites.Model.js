const mongoose = require('mongoose');
const { Schema, model, models } = mongoose;

const FavouritesSchema = new Schema({
  buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true }
}, { timestamps: true });

FavouritesSchema.index({ buyerId: 1, propertyId: 1 });

const FavouritesModel = models.Favourites || model('Favourites', FavouritesSchema);

module.exports = { FavouritesModel };
