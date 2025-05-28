const express = require('express')
const app = express()

const config = {
  MinVoltage: 100,
  MaxVoltage: 1000,
  MinCurrent: 5,
  MaxCurrent: 20,
  Polarity: "bipolar", 
  MeasurementValues: "both", 
  BufferSize: 25
}

let measurementId = 0
let buffer = []


app.get("/api/configuration", (req, res) => {
  res.json(config)
})


app.get("/api/status", (req, res) => {
  res.json({
    UsedPolarity: config.Polarity, 
    NewDataReady: buffer.length > 0 
  })
})


function generateMeasurement(polarity = "unipolar", type = "both") {
  const createValue = () => {
    let measurement = {
      posVoltage: null,
      posCurrent: null,
      negVoltage: null,
      negCurrent: null
    }
    if (type === "both" || type === "voltage") {
      measurement.posVoltage = Math.floor(Math.random() * (config.MaxVoltage - config.MinVoltage) + config.MinVoltage)
      if (polarity === "bipolar") {
        measurement.negVoltage = Math.floor(Math.random() * (config.MaxVoltage - config.MinVoltage) + config.MinVoltage)
      }
    }

    if (type === "both" || type === "current") {
      measurement.posCurrent = Math.floor(Math.random() * (config.MaxCurrent - config.MinCurrent) + config.MinCurrent)
      if (polarity === "bipolar") {
        measurement.negCurrent = Math.floor(Math.random() * (config.MaxCurrent - config.MinCurrent) + config.MinCurrent)
      }
    }

    return measurement
  }

  const valueCount = Math.random() > 0.5 ? 1 : 2

  return {
    id: measurementId++,
    timestamp: new Date().toISOString(),
    measuredValues: Array.from({ length: valueCount }, createValue)
  }
}

app.get("/api/measurements", (req, res) => {
  const newMeasurement = generateMeasurement(config.Polarity, config.MeasurementValues)
  buffer.push(newMeasurement)
  
  if (buffer.length > config.BufferSize) {
    buffer.shift()
  }
  res.json({ 
    measuredStorage: buffer 
  })
})

app.delete("/api/measurements", (req, res) => {
  buffer = []
  measurementId = 0
  res.json({ message: "Buffer cleared" })
})

app.put("/api/configuration", express.json(), (req, res) => {
  const { Polarity, MeasurementValues } = req.body
  
  if (Polarity && ["unipolar", "bipolar"].includes(Polarity)) {
    config.Polarity = Polarity
  }
  
  if (MeasurementValues && ["both", "voltage", "current"].includes(MeasurementValues)) {
    config.MeasurementValues = MeasurementValues
  }
  
  res.json(config)
})

app.listen(5000, () => {
  console.log("Server is running on port 5000")
  console.log("Available endpoints:")
  console.log("GET /api/configuration - Získat konfiguraci")
  console.log("GET /api/status - Získat status")
  console.log("GET /api/measurements - Získat měření")
  console.log("PUT /api/configuration - Změnit konfiguraci")
  console.log("DELETE /api/measurements - Vymazat buffer")
})