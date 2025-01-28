const mongoose =require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/TextEditor');

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


