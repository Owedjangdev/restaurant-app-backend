const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();
const User = require('./models/user');

async function createTestUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const password = await bcrypt.hash('password1234', 10);

        await User.deleteMany({ email: { $in: ['livreur@test.com', 'recrue@test.com'] } });

        await User.create([
            {
                fullName: 'Livreur de Test',
                email: 'livreur@test.com',
                phone: '00000000',
                password,
                role: 'livreur',
                isVerified: true,
                vehicleType: 'moto',
                licensePlate: 'TEST-123'
            },
            {
                fullName: 'Candidat Livreur',
                email: 'recrue@test.com',
                phone: '11111111',
                password,
                role: 'livreur',
                isVerified: false,
                vehicleType: 'velo'
            }
        ]);

        console.log('✅ Comptes livreurs créés');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur:', err);
        process.exit(1);
    }
}

createTestUsers();
