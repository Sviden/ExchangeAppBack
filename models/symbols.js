const mongoose = require("mongoose");

const SymbolsSchema = new mongoose.Schema({
  symbols: {
    type: Object,
  },
  Date: {
    type: Date,
    default: Date.now,
  },
});

const taskModel = mongoose.model("Symbols", SymbolsSchema);
module.exports = taskModel;
