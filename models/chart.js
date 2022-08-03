const mongoose = require('mongoose');

const ChartSchema = new mongoose.Schema({
    base: {type: String},
    startDate: {type: Date},
    endDate: {type: Date},
    rates: {type: Object},
    unit: {type: String},
    date: {type: Date}
})

const chartModel = mongoose.model("Chart", ChartSchema);
module.exports = chartModel;