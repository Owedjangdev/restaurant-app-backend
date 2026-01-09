/**
 * SEED - Créer l'admin et un livreur par défaut
 * Exécuter avec: node database/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const connectDB = require('./db');

const seedUsers = async () => {
  try {
    await connectDB();
    console.log('📦 Connexion à MongoDB réussie');

    // ========== ADMIN ==========
    const adminEmail = 'admin@restaurant.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      await User.create({
        fullName: 'Administrateur',
        email: adminEmail,
        phone: '0600000001',
        address: 'Siège Restaurant',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Admin créé avec succès');
    } else {
      console.log('ℹ️ Admin existe déjà');
    }

    // ========== LIVREUR ==========
    const livreurEmail = 'livreur@restaurant.com';
    const existingLivreur = await User.findOne({ email: livreurEmail });
    
    if (!existingLivreur) {
      const hashedPassword = await bcrypt.hash('Livreur123!', 10);
      await User.create({
        fullName: 'Livreur Principal',
        email: livreurEmail,
        phone: '0600000002',
        address: '',
        password: hashedPassword,
        role: 'livreur',
        isActive: true,
      });
      console.log('✅ Livreur créé avec succès');
    } else {
      console.log('ℹ️ Livreur existe déjà');
    }

    console.log('\n========================================');
    console.log('🔐 COORDONNÉES DE CONNEXION :');
    console.log('========================================');
    console.log('👤 ADMIN:');
    console.log('   Email: admin@restaurant.com');
    console.log('   Mot de passe: Admin123!');
    console.log('----------------------------------------');
    console.log('🚴 LIVREUR:');
    console.log('   Email: livreur@restaurant.com');
    console.log('   Mot de passe: Livreur123!');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur seed:', error);
    process.exit(1);
  }
};

seedUsers();
