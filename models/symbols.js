const mongoose = require('mongoose');

const SymbolsSchema = new mongoose.Schema({
  
    symbols:  {
        type: Object
      }

})

const taskModel = mongoose.model("Symbols", SymbolsSchema);
module.exports = taskModel;