const express = require('express');
const app = express();


const config = {
  MinVoltage: 100,
  MaxVoltage: 1000,
  MinCurrent: 5,
  MaxCurrent: 20,
  Polarity: "bipolar", 
  MeasurementValues: "both", 
  BufferSize: 25
};

let measurementId = 0;
let buffer = [];


let lastPosVoltage = config.MinVoltage + (config.MaxVoltage - config.MinVoltage) / 2;
let lastPosCurrent = config.MinCurrent + (config.MaxCurrent - config.MinCurrent) / 2;
let lastNegVoltage = -(config.MinVoltage + (config.MaxVoltage - config.MinVoltage) / 2);
let lastNegCurrent = -(config.MinCurrent + (config.MaxCurrent - config.MinCurrent) / 2);


let shouldGenerateNewData = false; 
let newDataTimer = 0; 
const newDataInterval = 3; 


function getRandomSmallAbsChange(maxAbsChange) {
  return (Math.random() * 2 - 1) * maxAbsChange;
}


app.get("/api", (req, res) => {
  res.json(config);
});


app.get("/status", (req, res) => {
  newDataTimer++;
  if (newDataTimer >= newDataInterval) {
    shouldGenerateNewData = true; 
    newDataTimer = 0; 
  } else {
    shouldGenerateNewData = false; 
  }

  res.json({
    polarity: config.Polarity,
    newDataReady: shouldGenerateNewData 
  });
});


function generateMeasurement(polarity, measurementType) {
  const createValue = () => {
    let posVoltage = null;
    let posCurrent = null;
    let negVoltage = null;
    let negCurrent = null;

    const maxVoltageAbsChange = (config.MaxVoltage - config.MinVoltage) * 0.05;
    const maxCurrentAbsChange = (config.MaxCurrent - config.MinCurrent) * 0.10;

    
    if (measurementType === "both" || measurementType === "voltage") {
      lastPosVoltage += getRandomSmallAbsChange(maxVoltageAbsChange);
      lastPosVoltage = Math.max(config.MinVoltage, Math.min(config.MaxVoltage, lastPosVoltage));
      posVoltage = Math.round(lastPosVoltage);
    }

    
    if (measurementType === "both" || measurementType === "current") {
      lastPosCurrent += getRandomSmallAbsChange(maxCurrentAbsChange);
      lastPosCurrent = Math.max(config.MinCurrent, Math.min(config.MaxCurrent, lastPosCurrent));
      posCurrent = Math.round(lastPosCurrent);
    }

    
    if (polarity === "bipolar" && (measurementType === "both" || measurementType === "voltage")) {
      lastNegVoltage += getRandomSmallAbsChange(maxVoltageAbsChange);
      lastNegVoltage = Math.min(-config.MinVoltage, Math.max(-config.MaxVoltage, lastNegVoltage));
      negVoltage = Math.round(lastNegVoltage);
    }

    
    if (polarity === "bipolar" && (measurementType === "both" || measurementType === "current")) {
      lastNegCurrent += getRandomSmallAbsChange(maxCurrentAbsChange);
      lastNegCurrent = Math.min(-config.MinCurrent, Math.max(-config.MaxCurrent, lastNegCurrent));
      negCurrent = Math.round(lastNegCurrent);
    }

    return { posVoltage, posCurrent, negVoltage, negCurrent };
  };

  const valueCount = Math.random() > 0.5 ? 1 : 2;

  return {
    id: measurementId++,
    timestamp: new Date().toISOString(),
    measuredValues: Array.from({ length: valueCount }, createValue)
  };
}


app.get("/measurements", (req, res) => {
  
  if (shouldGenerateNewData) { 
    const newMeasurement = generateMeasurement(config.Polarity, config.MeasurementValues);
    buffer.push(newMeasurement);

    if (buffer.length > config.BufferSize) {
      buffer.shift();
    }
    shouldGenerateNewData = false; 
  }

  res.json({ measuredStorage: buffer });
});


app.listen(5000, () => {
  console.log("Server is running on port 5000");
});