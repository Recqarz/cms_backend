const mongoose = require("mongoose");

// Using Schema.Types.Mixed to store any type of data inside the caseDetails
const caseSchema = new mongoose.Schema(
  {
    cnrNumber: { type: String, required: true, unique: true },  // CNR Number is still required and unique
    caseDetails: { type: mongoose.Schema.Types.Mixed, required: true },  // This allows any structure for caseDetails
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Case = mongoose.model("SearchCase", caseSchema);

module.exports = Case;
