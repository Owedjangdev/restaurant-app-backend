const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false, // 💡 Changé à false pour permettre les tests sans login
    },
    livreur: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    receiverPhone: {
      type: String,
      required: true,
    },
    instructions: {
      type: String,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ASSIGNED', 'IN_DELIVERY', 'DELIVERED', 'RECEIVED'],
      default: 'PENDING',
    },
    deliveryLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point', // 💡 Ajout d'une valeur par défaut
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    assignedAt: { type: Date },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    deliveryCode: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

orderSchema.index({ deliveryLocation: '2dsphere' });

module.exports = mongoose.model('Order', orderSchema);