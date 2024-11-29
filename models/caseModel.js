const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  cnrNumber: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ccEmails: [
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
    }
  ], 
});

// Unique index for (cnrNumber, userId)
caseSchema.index({ cnrNumber: 1, userId: 1 }, { unique: true });

const Case = mongoose.model('Case', caseSchema);

module.exports = Case;
