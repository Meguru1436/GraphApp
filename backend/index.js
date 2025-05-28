const express = require('express')
const app = express()

const config = {
  MinVoltage: 100,
  MaxVoltage: 1000,
  MinCurrent: 5,
  MaxCurrent: 20,
  Polarity: "bipolar", // nebo "unipolar"
  MeasurementValues: "both", // "voltage", "current", "both"
  BufferSize: 25
}

let measurementId = 0
let buffer = []

app.get("/api", (req, res) => {
  res.json(config)
})

app.get("/status", (req, res) => {
  res.json({
    polarity: config.Polarity,
    newDataReady: true
  })
})

function generateMeasurement(polarity = "unipolar", type = "both") {
  const createValue = () => ({
    posVoltage: Math.floor(Math.random() * (config.MaxVoltage - config.MinVoltage) + config.MinVoltage),
    posCurrent: type === "voltage" ? null : Math.floor(Math.random() * (config.MaxCurrent - config.MinCurrent) + config.MinCurrent),
    negVoltage: polarity === "bipolar" ? Math.floor(Math.random() * (config.MaxVoltage - config.MinVoltage) + config.MinVoltage) : null,
    negCurrent: (type === "voltage" || polarity === "unipolar")
      ? null
      : Math.floor(Math.random() * (config.MaxCurrent - config.MinCurrent) + config.MinCurrent)
  })

  const valueCount = Math.random() > 0.5 ? 1 : 2

  return {
    id: measurementId++,
    timestamp: new Date().toISOString(),
    measuredValues: Array.from({ length: valueCount }, createValue)
  }
}

app.get("/measurements", (req, res) => {
  const newMeasurement = generateMeasurement(config.Polarity, config.MeasurementValues)
  buffer.push(newMeasurement)
  if (buffer.length > config.BufferSize) buffer.shift()

  res.json({ measuredStorage: buffer })
})

app.listen(5000, () => {
  console.log("Server is running on port 5000")
})