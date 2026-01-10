const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");

        // Check if admin exists
        const existingAdmin = await Admin.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log("Admin user 'admin' already exists.");
            process.exit(0);
        }

        const newAdmin = new Admin({
            username: 'admin',
            password: 'admin_pass_123'
        });

        await newAdmin.save();
        console.log("Admin user 'admin' created successfully.");
        console.log("Password: admin_pass_123");

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAdmin();
