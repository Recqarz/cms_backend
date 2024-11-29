const mongoose = require('mongoose');

// Create a schema for the uploaded files
const cnrFileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true,
  },
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

// Create and export the model
const CnrFile = mongoose.model('CnrFile', cnrFileSchema);
module.exports = CnrFile;
