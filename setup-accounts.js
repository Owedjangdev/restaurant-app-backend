require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// User Schema (simplified)
const userSchema = new mongoose.Schema({
    fullName: String,
    email: String,
    phone: String,
    address: String,
    password: String,
    role: String,
    isActive: Boolean,
    isVerified: Boolean,
    vehicleType: String,
    licensePlate: String,
    rating: Number,
    permissions: [String],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const setupAdminAndDelivery = async () => {
    await connectDB();

    console.log('\n🔍 Checking for existing admin and delivery accounts...\n');

    // Check for admin
    let admin = await User.findOne({ role: 'admin' });

    if (!admin) {
        console.log('📝 Creating admin account...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        admin = await User.create({
            fullName: 'Administrateur',
            email: 'admin@restaurant.com',
            phone: '+243900000000',
            address: 'Bureau Principal',
            password: hashedPassword,
            role: 'admin',
            isActive: true,
            isVerified: true,
            permissions: ['all']
        });
        console.log('✅ Admin account created!');
    } else {
        console.log('✅ Admin account already exists');
    }

    // Check for delivery person
    let delivery = await User.findOne({ role: 'livreur' });

    if (!delivery) {
        console.log('📝 Creating delivery account...');
        const hashedPassword = await bcrypt.hash('livreur123', 10);
        delivery = await User.create({
            fullName: 'Livreur Test',
            email: 'livreur@restaurant.com',
            phone: '+243911111111',
            address: 'Zone de livraison',
            password: hashedPassword,
            role: 'livreur',
            isActive: true,
            isVerified: true,
            vehicleType: 'moto',
            licensePlate: 'ABC-123',
            rating: 5
        });
        console.log('✅ Delivery account created!');
    } else {
        console.log('✅ Delivery account already exists');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 IDENTIFIANTS DE CONNEXION');
    console.log('='.repeat(60));

    console.log('\n👨‍💼 ADMINISTRATEUR:');
    console.log('   Email    : admin@restaurant.com');
    console.log('   Password : admin123');
    console.log('   Role     : admin');

    console.log('\n🏍️  LIVREUR:');
    console.log('   Email    : livreur@restaurant.com');
    console.log('   Password : livreur123');
    console.log('   Role     : livreur');

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 Utilisez ces identifiants pour vous connecter via:');
    console.log('   POST http://localhost:3000/api/auth/login');
    console.log('\n');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
};

setupAdminAndDelivery().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
