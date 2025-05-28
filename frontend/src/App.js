import React, { useEffect, useState } from 'react';
import './index.css';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [measurements, setMeasurements] = useState([]);

  
  const [showVoltagePos, setShowVoltagePos] = useState(true);
  const [showVoltageNeg, setShowVoltageNeg] = useState(false);
  const [showCurrentPos, setShowCurrentPos] = useState(true);
  const [showCurrentNeg, setShowCurrentNeg] = useState(false);

  
  const voltagePosColor = 'rgba(255, 150, 150, 1)'; 
  const voltagePosBgColor = 'rgba(255, 150, 150, 0.2)';
  const voltageNegColor = 'rgba(200, 50, 50, 1)';     
  const voltageNegBgColor = 'rgba(200, 50, 50, 0.2)';
  const currentPosColor = 'rgba(0, 200, 200, 1)';   
  const currentPosBgColor = 'rgba(0, 200, 200, 0.5)';
  const currentNegColor = 'rgba(0, 0, 200, 1)';     
  const currentNegBgColor = 'rgba(0, 0, 200, 0.5)';


  
  useEffect(() => {
    fetch("/api")
      .then(res => res.json())
      .then(data => {
        console.log("Konfigurace:", data);
        setConfig(data);
        
        if (data.Polarity === "unipolar") {
          setShowVoltageNeg(false); 
          setShowCurrentNeg(false);
        } else { 
          setShowVoltageNeg(data.MeasurementValues === "both" || data.MeasurementValues === "voltage");
          setShowCurrentNeg(data.MeasurementValues === "both" || data.MeasurementValues === "current");
        }
        
        setShowVoltagePos(data.MeasurementValues === "both" || data.MeasurementValues === "voltage");
        setShowCurrentPos(data.MeasurementValues === "both" || data.MeasurementValues === "current");
      })
      .catch(error => console.error("Chyba při načítání konfigurace:", error));
  }, []);

  
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/status") 
        .then(res => res.json())
        .then(currentStatus => {
          setStatus(currentStatus);
          
          if (currentStatus.newDataReady) { 
            fetch("/measurements") 
              .then(res => res.json())
              .then(data => {
                console.log("Nová měření:", data.measuredStorage);
                setMeasurements(data.measuredStorage);
              })
              .catch(error => console.error("Chyba při načítání měření:", error));
          }
        })
        .catch(error => console.error("Chyba při načítání statusu:", error));
    }, 1000); 

    return () => clearInterval(interval); 
  }, []);

  
  const chartData = {
    labels: measurements.map((m, index) => m.id), 
    datasets: [],
  };

  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
            color: '#abb2bf', 
        }
      },
      title: {
        display: false, 
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Measurement ID', 
          color: '#abb2bf',
        },
        ticks: {
          color: '#abb2bf',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)', 
        },
      },
      
      yVoltage: {
        type: 'linear',
        display: 'auto',
        position: 'right', 
        title: {
          display: true,
          text: 'Voltage [kV]',
          color: '#abb2bf',
        },
        ticks: {
          color: '#abb2bf',
        },
        
        min: config ? (config.Polarity === "bipolar" ? -config.MaxVoltage / 1000 : config.MinVoltage / 1000) : -5.5,
        max: config ? config.MaxVoltage / 1000 : 5.5,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      
      yCurrent: {
        type: 'linear',
        display: 'auto',
        position: 'left', 
        title: {
          display: true,
          text: 'Current [A]',
          color: '#abb2bf',
        },
        ticks: {
          color: '#abb2bf',
        },
        
        min: config ? (config.Polarity === "bipolar" ? -config.MaxCurrent : config.MinCurrent) : -30,
        max: config ? config.MaxCurrent : 30,
        grid: {
          drawOnChartArea: false, 
        },
      },
    },
  };

  
  const getPointStyle = (measuredValues) => {
    return measuredValues && measuredValues.length > 1 ? 'disc' : 'circle';
  };

  
  if (config && showVoltagePos && (config.MeasurementValues === "both" || config.MeasurementValues === "voltage")) {
    chartData.datasets.push({
      label: 'Voltage (kV+)',
      data: measurements.map(m => m.measuredValues[0]?.posVoltage !== null ? m.measuredValues[0]?.posVoltage / 1000 : null),
      borderColor: voltagePosColor,
      backgroundColor: voltagePosBgColor,
      yAxisID: 'yVoltage',
      tension: 0.1,
      pointRadius: 3,
      pointStyle: measurements.map(m => getPointStyle(m.measuredValues)),
      borderDash: [5, 5],
    });
  }

 
  if (config && showVoltageNeg && config.Polarity === "bipolar" && (config.MeasurementValues === "both" || config.MeasurementValues === "voltage")) {
    chartData.datasets.push({
      label: 'Voltage (kV-)',
      data: measurements.map(m => m.measuredValues[0]?.negVoltage !== null ? m.measuredValues[0]?.negVoltage / 1000 : null),
      borderColor: voltageNegColor,
      backgroundColor: voltageNegBgColor,
      yAxisID: 'yVoltage',
      tension: 0.1,
      pointRadius: 3,
      pointStyle: measurements.map(m => getPointStyle(m.measuredValues)),
      borderDash: [5, 5],
    });
  }

  
  if (config && showCurrentPos && (config.MeasurementValues === "both" || config.MeasurementValues === "current")) {
    chartData.datasets.push({
      label: 'Current (A+)',
      data: measurements.map(m => m.measuredValues[0]?.posCurrent),
      borderColor: currentPosColor,
      backgroundColor: currentPosBgColor,
      yAxisID: 'yCurrent',
      tension: 0.1,
      pointRadius: 3,
      pointStyle: measurements.map(m => getPointStyle(m.measuredValues)),
      borderDash: [5, 5],
    });
  }

  
  if (config && showCurrentNeg && config.Polarity === "bipolar" && (config.MeasurementValues === "both" || config.MeasurementValues === "current")) {
    chartData.datasets.push({
      label: 'Current (A-)',
      data: measurements.map(m => m.measuredValues[0]?.negCurrent),
      borderColor: currentNegColor,
      backgroundColor: currentNegBgColor,
      yAxisID: 'yCurrent',
      tension: 0.1,
      pointRadius: 3,
      pointStyle: measurements.map(m => getPointStyle(m.measuredValues)),
      borderDash: [5, 5],
    });
  }

  
  const handleToggleChange = (setter, currentState) => {
    setter(!currentState);
  };

  return (
    <div className="container">
      <div className="graph-section">
        <div className="card">
          <h2 className="card-title">Graph</h2>
          <div style={{ position: 'relative', height: '400px', width: '100%' }}>
            
            {config ? <Line data={chartData} options={chartOptions} /> : <p>Loading graph data...</p>}
          </div>
        </div>
      </div>

      <div className="status-data-section">
        <div className="card system-status">
          <h2 className="card-title">System Status</h2>
          <div className="status-item">
            <span className="status-label">Connection</span>
            <span>Online</span>
          </div>
          <div className="status-item">
            <span className="status-label">Polarity</span>
            <span>{config ? config.Polarity : 'N/A'}</span> 
          </div>
          <div className="status-item">
            <span className="status-label">Measurements</span>
            <span>{config ? config.MeasurementValues : 'N/A'}</span> 
          </div>
          <div className="status-item">
            <span className="status-label">Buffer Size</span>
            <span>{config ? config.BufferSize : 'N/A'}</span> 
          </div>
        </div>

        <div className="card data-series" style={{ marginTop: '20px' }}>
          <h2 className="card-title">Data Series</h2>
    
          {config && (config.MeasurementValues === "both" || config.MeasurementValues === "voltage") && (
            <div className="data-series-option">
              <div className="color-dot" style={{ backgroundColor: voltagePosColor }}></div>
              <span>Voltage (kV+)</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showVoltagePos}
                  onChange={() => handleToggleChange(setShowVoltagePos, showVoltagePos)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          )}
          {config && config.Polarity === "bipolar" && (config.MeasurementValues === "both" || config.MeasurementValues === "voltage") && (
            <div className="data-series-option">
              <div className="color-dot" style={{ backgroundColor: voltageNegColor }}></div>
              <span>Voltage (kV-)</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showVoltageNeg}
                  onChange={() => handleToggleChange(setShowVoltageNeg, showVoltageNeg)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          )}
          {config && (config.MeasurementValues === "both" || config.MeasurementValues === "current") && (
            <div className="data-series-option">
              <div className="color-dot" style={{ backgroundColor: currentPosColor }}></div>
              <span>Current (A+)</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showCurrentPos}
                  onChange={() => handleToggleChange(setShowCurrentPos, showCurrentPos)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          )}
          {config && config.Polarity === "bipolar" && (config.MeasurementValues === "both" || config.MeasurementValues === "current") && (
            <div className="data-series-option">
              <div className="color-dot" style={{ backgroundColor: currentNegColor }}></div>
              <span>Current (A-)</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showCurrentNeg}
                  onChange={() => handleToggleChange(setShowCurrentNeg, showCurrentNeg)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          )}

          
          <div className="radio-group" style={{ display: 'none' }}>
            <label>
              <input type="radio" name="display-toggle" value="on" defaultChecked /> On
            </label>
            <label>
              <input type="radio" name="display-toggle" value="off" /> Off
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;