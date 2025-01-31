
const mongoose = require('mongoose');

// Use environment variable for the MongoDB URI
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/TextEditor'; // Default for local testing

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB!");
}).catch((err) => {
  console.log("Error connecting to MongoDB:", err);
});


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


