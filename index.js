const express = require("express");
const config = require("./Config/config.json");
const app = express();
app.use(express.json());
const axios = require("axios");
var moment = require("moment");

const cors = require("cors");
app.use(cors());

const mongoose = require("mongoose");
mongoose.connect(config.mongoDbConnection);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error"));

db.once("open", () => {
  console.log("database connected");
});

//MONGOOSE MODELS
const metalModel = require("./models/metal.js");
const currModel = require("./models/curr.js");
const symbolModel = require("./models/symbols");
const chartModel = require("./models/chart");
const goldPriceModel = require("./models/goldSilverPrice");

// TOP BAR CURRENCIES
app.get("/currencies", async (req, res) => {
  const options = { headers: { apikey: config.topBarCurrRateAPIkey } };

  let base = req.query.base;

  if (!base) {
    base = "EUR";
  }

  let randomRes = await currModel.aggregate().match({ base: base }).sample(1);
  let randomResString = JSON.stringify(randomRes);
  let latestData = await currModel
    .find({ base: base })
    .sort({ date: -1 })
    .limit(1);
  let toReturn;
  if (
    !latestData ||
    latestData.length == 0 ||
    moment(latestData[0].date) < moment(Date.now()).add(-6, "hours")
  ) {
    let exchangeData = await axios.get(
      `https://api.apilayer.com/exchangerates_data/latest?base=${base}&symbols=USD,EUR,BTC`,
      options
    );
    toReturn = exchangeData.data;
    const curr = new currModel({
      base: exchangeData.data.base,
      eur: exchangeData.data.rates.EUR,
      usd: exchangeData.data.rates.USD,
      btc: exchangeData.data.rates.BTC,
      date: moment.unix(exchangeData.data.timestamp),
    });
    try {
      await curr.save();
    } catch (err) {
      console.log(err);
      return err;
    }
    toReturn = curr;
    console.log(exchangeData);
  } else {
    if (randomRes) toReturn = randomRes[0];
  }

  res.send(toReturn);
});

// GOLD/SILVER TOP BAR
function generateMockLatestResponse(
  base = "USD",
  symbols = ["XAU", "XAG", "XPD"]
) {
  function randomRateValue(symbol) {
    if (symbol === "XAG") {
      return (0.01 + Math.random() * (4 - 0.01)).toFixed(4); // XAG always above 0.01
    } else {
      return (0.0001 + Math.random() * (0.001 - 0.0001)).toFixed(4); // Default range for others
    }
  }

  const rates = {};
  symbols.forEach((symbol) => {
    rates[symbol] = parseFloat(randomRateValue(symbol));
  });

  return {
    data: {
      success: true,
      timestamp: Math.floor(Date.now() / 1000), // Current timestamp
      base: base,
      date: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD format
      rates: rates,
    },
    status: 200,
    statusText: "OK",
    headers: {
      "content-type": "application/json",
    },
    config: {},
    request: {},
  };
}

app.get("/metal", async (req, res) => {
  try {
    const apiKey = config.topBarMetalRateAPIkey;
    let base = req.query.base;
    if (!base) {
      base = "EUR";
    }

    let toReturn;
    let latestData = await metalModel
      .find({ base: base })
      .sort({ date: -1 })
      .limit(1);
    if (
      !latestData ||
      latestData.length === 0 ||
      moment(latestData[0].date) <
        moment(new Date().toUTCString()).add(-1, "days")
    ) {
      const data = generateMockLatestResponse(base, ["XAU", "XAG"]); //await axios.get(`https://metals-api.com/api/latest?access_key=${apiKey}&base=${base}&symbols=XAU,XAG`);
      // await axios.get(
      //   `https://metals-api.com/api/latest?access_key=${apiKey}&base=${base}&symbols=XAU,XAG`
      // );

      if (data.success || (data.data && data.data.success)) {
        try {
          const metal = new metalModel({
            base: data.data.base,
            gold: data.data.rates.XAU,
            silver: data.data.rates.XAG,
            date: new Date(
              new Date(moment.unix(data.data.timestamp)).toUTCString()
            ),
          });

          toReturn = metal;
          await metal.save();
        } catch (err) {
          console.log(data);
          console.log(err);
          let randomRes = await metalModel
            .aggregate()
            .match({ base: base })
            .sample(1);

          if (randomRes) {
            toReturn = randomRes[0];
          } else toReturn = err;
          return toReturn;
        }
      } else {
        let randomRes = await metalModel
          .aggregate()
          .match({ base: base })
          .sample(1);
        if (randomRes) toReturn = randomRes[0];
      }
    } else {
      let randomRes = await metalModel
        .aggregate()
        .match({ base: base })
        .sample(1);

      if (randomRes) toReturn = randomRes[0];
    }

    res.send(toReturn);
  } catch (ex) {
    console.log(ex);
  }
});

//CURRENCY EXCHANGE

app.get("/conversion", async (req, res) => {
  const options = { headers: { apikey: config.conversionAndSymbolsAPIkey } };
  const from = req.query.from;
  const to = req.query.to;
  const amount = req.query.amount;

  const data = await axios.get(
    `https://api.apilayer.com/exchangerates_data/convert?to=${to}&from=${from}&amount=${amount}`,
    options
  );

  res.send(data.data);
});

//GET SYMBOLS

app.get("/symbols", async (req, res) => {
  const options = { headers: { apikey: config.conversionAndSymbolsAPIkey } };

  const data = await axios.get(
    "https://api.apilayer.com/exchangerates_data/symbols",
    options
  );
  const symbols = new symbolModel({
    symbols: data.data.symbols,
  });
  try {
    await symbols.save();
  } catch (err) {
    console.log(err);
    return err;
  }
  res.send(data.data.symbols);
});

app.get("/currsymbols", async (req, res) => {
  const symbols = await symbolModel.find({});
  res.send(symbols[0].symbols);
});

//Chart data
const generateMockChartResponse = (
  startDate,
  endDate,
  base = "EUR",
  symbols = ["USD"],
  unit = "per ounce"
) => {
  function randomRateValue() {
    return (0.8 + Math.random() * (1.2 - 0.8)).toFixed(6);
  }

  const rates = {};
  const currentDate = new Date(startDate);
  const endDateObj = new Date(endDate);

  while (currentDate <= endDateObj) {
    const dateStr = currentDate.toISOString().split("T")[0];
    rates[dateStr] = {};
    symbols.forEach((symbol) => {
      rates[dateStr][symbol] = parseFloat(randomRateValue());
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const mockData = {
    base: base,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    rates: rates,
    unit: unit,
    date: new Date(),
    success: true, // Current date for the response
  };

  return {
    data: mockData,
    status: 200,
    statusText: "OK",
    headers: {
      "content-type": "application/json",
    },
    config: {}, // The config used to make the request
    request: {}, // The request that generated this response (can be left empty for the mock)
  };
};

app.get("/chartdata", async (req, res) => {
  const endDate = moment().subtract(1, "days").format("YYYY-MM-DD");
  const startDate = moment().subtract(8, "days").format("YYYY-MM-DD");
  const apiKey = config.chartDataAPIkey;
  //const theCall = `https://metals-api.com/api/timeseries?access_key=${apiKey}&start_date=${startDate}&end_date=${endDate}&base=XAG&symbols=XAU`;

  let latestData = await chartModel.find({}).sort({ date: -1 }).limit(1);

  let toReturn;

  if (
    !latestData ||
    latestData.length === 0 ||
    moment(latestData[0].date) <
      moment(new Date().toUTCString()).add(-1, "days")
  ) {
    const data = generateMockChartResponse(startDate, endDate, "XAG", ["XAU"]); //await axios.get(theCall);

    if (data || (data.data && data.data.success)) {
      const chart = new chartModel({
        base: data.data.base,
        startDate: startDate,
        endDate: data.data.end_date,
        rates: data.data.rates,
        date: new Date(),
      });

      try {
        chart.save();
      } catch (err) {
        console.log(err);
        return err;
      }

      toReturn = chart;
    } else {
      console.log(data);
      toReturn = latestData[0];
    }
  } else {
    toReturn = latestData[0];
  }

  res.send(toReturn);
});

//GOLD SILVER PRICE MAIN CONTAINER
app.get("/goldsilverprice", async (req, res) => {
  const metal = req.query.metal;
  const currency = req.query.currency;
  let toReturn;

  var requestOptions = {
    method: "GET",
    headers: {
      "x-access-token": config.goldSilverPriceAccess,
      "Content-Type": "application/json",
    },
    redirect: "follow",
  };

  let latestData = await goldPriceModel
    .find({ metal: metal, currency: currency })
    .sort({ date: -1 })
    .limit(1);

  if (
    (metal && currency && !latestData) ||
    latestData.length === 0 ||
    moment(latestData[0].date) <
      moment(new Date().toUTCString()).add(-1, "days")
  ) {
    const data = await axios.get(
      `https://www.goldapi.io/api/${metal}/${currency}`,
      requestOptions
    );

    const price = goldPriceModel({
      price18: data.data.price_gram_18k,
      price20: data.data.price_gram_20k,
      price21: data.data.price_gram_21k,
      price22: data.data.price_gram_22k,
      price24: data.data.price_gram_24k,
      metal: data.data.metal,
      currency: data.data.currency,
    });

    try {
      price.save();
    } catch (err) {
      return err;
    }
    toReturn = price;
  } else {
    toReturn = latestData[0];
  }

  res.send(toReturn);
});

let thePort = process.env.PORT ? process.env.PORT : 8080;
app.listen(thePort, (req, res) => {
  console.log(`server runnning on port ${thePort}`);
});
