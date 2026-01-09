/**
 * Vérifier le compte admin
 * Exécuter avec: node database/check-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const connectDB = require('./db');

const checkAdmin = async () => {
  try {
    await connectDB();
    console.log('📦 Connexion à MongoDB réussie\n');

    // Chercher l'admin
    const admin = await User.findOne({ email: 'admin@restaurant.com' }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin NON TROUVÉ dans la base de données');
      console.log('👉 Exécute: node database/seed.js');
    } else {
      console.log('✅ Admin trouvé:');
      console.log('   ID:', admin._id);
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
      console.log('   isActive:', admin.isActive);
      
      // Tester le mot de passe
      const testPassword = 'Admin123!';
      const isValid = await bcrypt.compare(testPassword, admin.password);
      console.log('\n🔐 Test mot de passe "Admin123!":', isValid ? '✅ OK' : '❌ INCORRECT');
      
      if (!isValid) {
        console.log('\n🔧 Réinitialisation du mot de passe admin...');
        admin.password = await bcrypt.hash('Admin123!', 10);
        await admin.save();
        console.log('✅ Mot de passe admin réinitialisé à: Admin123!');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

checkAdmin();
