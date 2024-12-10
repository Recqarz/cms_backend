const mongoose = require("mongoose");

const unsavedCnrSchema = new mongoose.Schema(
  {
    cnrNumber: { type: String, required: true },
    userIDs: [{
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
    }],
  },
  
  { timestamps: false }
);

// const UnsaveCnrCollection = mongoose.model("UnsavedCnrNumber", unsavedCnrSchema);
const UnsaveCnrCollection = mongoose.models.UnsavedCnrNumber || mongoose.model("UnsavedCnrNumber", unsavedCnrSchema);


// mongoose.models.CnrDetails || mongoose.model('CnrDetails', updateCnrDataSchema);

module.exports = UnsaveCnrCollection;