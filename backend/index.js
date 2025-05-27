const express = require('express')
const app = express()

app.get("/api", (req, res) => {
  res.json({
    ConfigurationResponse: {
      MinVoltage: 100,
      MaxVoltage: 1000,
      MinCurrent: 5,
      MaxCurrent: 20,
      Polarity: "unipolar | bipolar",
      MeasurementValues: "both | voltage | current",
      BufferSize: 25
    }
  })
})

app.listen(5000, () => {
  console.log("Server is running on port 5000")
})
