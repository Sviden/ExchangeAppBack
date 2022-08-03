const mongoose = require ('mongoose');

const priceSchema = new mongoose.Schema({
    price18: String,
    price20: String,
    price21: String,
    price22: String,
    price24: String,
    metal: String,
    currency: String,
    date: Date
})

const goldPriceModel = new mongoose.model('goldPrice', priceSchema);
module.exports = goldPriceModel;