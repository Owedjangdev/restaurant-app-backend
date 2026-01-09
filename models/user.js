const mongoose =require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    address: {
      type: String,
      required: function () {
        return this.role === "client";
      },
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // important: hide password by default
    },

    role: {
      type: String,
      enum: ["admin", "client", "livreur"],
      default: "client",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Réinitialisation de mot de passe
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpiry: {
      type: Date,
      select: false,
    },

    // Pour les livreurs
    isVerified: {
      type: Boolean,
      default: false,
    },
    vehicleType: {
      type: String,
      enum: ['moto', 'velo', 'auto'],
    },
    licensePlate: String,
    bankAccount: String,
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },

    // Pour les admins
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports= mongoose.model("User",userSchema);



