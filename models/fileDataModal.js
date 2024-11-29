const mongoose = require('mongoose');

// Create a schema for the file data
const fileDataSchema = new mongoose.Schema({
  fileID: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CnrFile', 
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed, 
    required: true,
  },
  userID: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const FileData = mongoose.model('FileData', fileDataSchema);
module.exports = FileData;
