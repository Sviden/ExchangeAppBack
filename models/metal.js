const mongoose = require('mongoose');

const MetalSchema = new mongoose.Schema({
    base: {type: String},
    gold: {type: Number},
    silver: {type: Number},
    date: {type: Date}
})

const taskModel = mongoose.model("Metal", MetalSchema);
module.exports = taskModel;