// Load environment variables
require('dotenv').config();

// Import Mongoose
const mongoose = require('mongoose');

// Connect to MongoDB Atlas using the connection string from .env
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.log('MongoDB connection error:', err));


const UserSchema= mongoose.Schema({
  title:{
      type: String,
      required: true
  },
  content:{
      type: String,
      required: true
  },
  Currentdate: { type: Date, default: Date.now } 

})


module.exports= mongoose.model('User', UserSchema);


