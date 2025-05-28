import React, { useEffect, useState } from 'react';
import './index.css'; 
import { Line } from 'react-chartjs-2'; // Importujeme Line komponentu z react-chartjs-2
import {
  Chart as ChartJS, // Import Chart.js základní třídy
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrace komponent Chart.js, které budeme používat
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

  // Stavy pro zapínání/vypínání datových řad
  const [showVoltagePos, setShowVoltagePos] = useState(true);
  const [showVoltageNeg, setShowVoltageNeg] = useState(false); // Defaultně vypnuto, pokud je bipolar
  const [showCurrentPos, setShowCurrentPos] = useState(true);
  const [showCurrentNeg, setShowCurrentNeg] = useState(false); // Defaultně vypnuto, pokud je bipolar

  useEffect(() => {
    // Načtení konfigurace při startu
    fetch("/api")
      .then(res => res.json())
      .then(data => {
        console.log("Konfigurace:", data);
        setConfig(data);
        // Nastavíme počáteční stav pro negativní měření na základě polarity
        if (data.Polarity === "unipolar") {
          setShowVoltageNeg(false);
          setShowCurrentNeg(false);
        }
      })
      .catch(error => console.error("Chyba při načítání konfigurace:", error));
  }, []);

  useEffect(() => {
    // Pravidelné získávání statusu a případných měření
    const interval = setInterval(() => {
      fetch("/status")
        .then(res => res.json())
        .then(currentStatus => {
          setStatus(currentStatus); // Uložíme status
          if (currentStatus.newDataReady) {
            fetch("/measurements")
              .then(res => res.json())
              .then(data => {
                console.log("Nová měření:", data.measuredStorage); // Logování
                setMeasurements(data.measuredStorage); // Uložíme měření
              })
              .catch(error => console.error("Chyba při načítání měření:", error));
          }
        })
        .catch(error => console.error("Chyba při načítání statusu:", error));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Příprava dat pro Chart.js
  const chartData = {
    labels: measurements.map((m, index) => index + 1), // Použijeme index jako label pro jednoduchost
    datasets: [],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Důležité pro plné vyplnění kontejneru
    plugins: {
      legend: {
        position: 'top',
        labels: {
            color: '#abb2bf', // Barva popisků legendy
        }
      },
      title: {
        display: true,
        text: 'Measured Values Over Time',
        color: '#abb2bf', // Barva nadpisu
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
          color: '#abb2bf', // Barva popisků osy X
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)', // Barva mřížky
        },
      },
      yVoltage: { // Osa pro napětí
        type: 'linear',
        display: 'auto', // Zobrazí osu jen pokud je použita
        position: 'left',
        title: {
          display: true,
          text: 'Voltage [kV]',
          color: '#abb2bf',
        },
        ticks: {
          color: '#abb2bf',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      yCurrent: { // Osa pro proud
        type: 'linear',
        display: 'auto',
        position: 'right', // Na pravé straně
        title: {
          display: true,
          text: 'Current [A]',
          color: '#abb2bf',
        },
        ticks: {
          color: '#abb2bf',
        },
        grid: {
          drawOnChartArea: false, // Nezobrazovat mřížku pro tuto osu, aby se nepřekrývala
        },
      },
    },
  };

  // Dynamické přidávání datových řad na základě stavu a dostupnosti dat
  if (showVoltagePos && (config?.MeasurementValues === "both" || config?.MeasurementValues === "voltage")) {
    chartData.datasets.push({
      label: 'Voltage (kV+)',
      data: measurements.map(m => m.measuredValues[0]?.posVoltage),
      borderColor: 'orange',
      backgroundColor: 'rgba(255, 165, 0, 0.5)',
      yAxisID: 'yVoltage', // Použijeme osu pro napětí
      tension: 0.1,
      pointRadius: 3,
    });
  }

  if (showVoltageNeg && config?.Polarity === "bipolar" && (config?.MeasurementValues === "both" || config?.MeasurementValues === "voltage")) {
    chartData.datasets.push({
      label: 'Voltage (kV-)',
      data: measurements.map(m => m.measuredValues[0]?.negVoltage),
      borderColor: 'red',
      backgroundColor: 'rgba(255, 0, 0, 0.5)',
      yAxisID: 'yVoltage',
      tension: 0.1,
      pointRadius: 3,
    });
  }

  if (showCurrentPos && (config?.MeasurementValues === "both" || config?.MeasurementValues === "current")) {
    chartData.datasets.push({
      label: 'Current (A+)',
      data: measurements.map(m => m.measuredValues[0]?.posCurrent),
      borderColor: 'blue',
      backgroundColor: 'rgba(0, 0, 255, 0.5)',
      yAxisID: 'yCurrent', // Použijeme osu pro proud
      tension: 0.1,
      pointRadius: 3,
    });
  }

  if (showCurrentNeg && config?.Polarity === "bipolar" && (config?.MeasurementValues === "both" || config?.MeasurementValues === "current")) {
    chartData.datasets.push({
      label: 'Current (A-)',
      data: measurements.map(m => m.measuredValues[0]?.negCurrent),
      borderColor: 'purple',
      backgroundColor: 'rgba(128, 0, 128, 0.5)',
      yAxisID: 'yCurrent',
      tension: 0.1,
      pointRadius: 3,
    });
  }

  // Funkce pro přepínání stavu checkboxů
  const handleToggleChange = (setter, currentState) => {
    setter(!currentState);
  };

  return (
    <div className="container">
      <div className="graph-section">
        <div className="card">
          <h2 className="card-title">Graph</h2>
          <div style={{ position: 'relative', height: '400px', width: '100%' }}>
            {/* Zde vykreslíme graf */}
            <Line data={chartData} options={chartOptions} />
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
            <span>{status ? status.polarity : 'N/A'}</span>
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

        {/* Přidáno style={{ marginTop: '20px' }} pro oddělení od System Status */}
        <div className="card data-series" style={{ marginTop: '20px' }}>
          <h2 className="card-title">Data Series</h2>
          {/* Checkboxy pro přepínání grafů */}
          {(config?.MeasurementValues === "both" || config?.MeasurementValues === "voltage") && (
            <div className="data-series-option">
              <div className="color-dot" style={{ backgroundColor: 'orange' }}></div>
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
          {config && config.Polarity === "bipolar" && (config?.MeasurementValues === "both" || config?.MeasurementValues === "voltage") && (
            <div className="data-series-option">
              <div className="color-dot" style={{ backgroundColor: 'red' }}></div>
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
          {(config?.MeasurementValues === "both" || config?.MeasurementValues === "current") && (
            <div className="data-series-option">
              <div className="color-dot" style={{ backgroundColor: 'blue' }}></div>
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
          {config && config.Polarity === "bipolar" && (config?.MeasurementValues === "both" || config?.MeasurementValues === "current") && (
            <div className="data-series-option">
              <div className="color-dot" style={{ backgroundColor: 'purple' }}></div>
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