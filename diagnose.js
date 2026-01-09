const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

const diagnose = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({});
        console.log('👥 Users in DB:');
        users.forEach(u => {
            console.log(`- Name: ${u.fullName}, Email: ${u.email}, Role: ${u.role}, ID: ${u._id}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

diagnose();
