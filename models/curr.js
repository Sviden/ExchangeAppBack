const mongoose = require('mongoose');
var random = require('mongoose-random');


const CurrSchema = new mongoose.Schema({
    base: {type: String},
    usd: {type: Number},
    eur: {type: Number},
    btc: {type: Number},
    date: {type: Date}
})
CurrSchema.plugin(random, { path: 'r' });
const taskModel = mongoose.model("Currencies", CurrSchema);
module.exports = taskModel;