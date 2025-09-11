// Load environment variables
require('dotenv').config();

// Import Mongoose
const mongoose = require('mongoose');

// Connect to MongoDB Atlas using the connection string from .env
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.log('MongoDB connection error:', err));


const UserSchema = mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the UserRegistration model
    ref: 'UserRegistration', // Name of the referenced model
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false // Default to false, meaning the note is private
  },
  Currentdate: { type: Date, default: Date.now }

})


module.exports = mongoose.model('User', UserSchema);


