const mongoose = require("mongoose");

const unsavedCnrSchema = new mongoose.Schema(
  {
    cnrNumber: { type: String, required: true },
    userIDs: [{
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
    }],
    status: {type: Boolean}
  },
  
  { timestamps: false }
);

const UnsaveCnrCollection = mongoose.models.UnsavedCnrNumber || mongoose.model("UnsavedCnrNumber", unsavedCnrSchema);

module.exports = UnsaveCnrCollection;