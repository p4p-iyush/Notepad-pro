const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

// Validate required environment variables
if (!MONGO_URI) {
    console.error('❌ MONGO_URI environment variable is required');
    process.exit(1);
}

// 📊 MongoDB Connection with Retry Logic
const connectDB = async () => {
    let retries = 5;
    while (retries) {
        try {
            await mongoose.connect(MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10, // Maximum number of socket connections
                serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
                socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                bufferMaxEntries: 0, // Disable mongoose buffering
                bufferCommands: false, // Disable mongoose buffering
            });
            console.log('✅ MongoDB connected successfully');
            break;
        } catch (error) {
            console.error(`❌ MongoDB connection error: ${error.message}`);
            retries--;
            console.log(`Retries left: ${retries}`);
            if (retries === 0) {
                console.error('❌ Failed to connect to MongoDB after 5 attempts');
                process.exit(1);
            }
            // Wait 5 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

module.exports = connectDB;
