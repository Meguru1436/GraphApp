import React, { useState, useEffect } from 'react';
import { api, validators } from './utils/api';
import './App.css';

function App() {
  const [configuration, setConfiguration] = useState(null);
  const [status, setStatus] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        setLoading(true);
        const config = await api.getConfiguration();
        setConfiguration(config);
        console.log('Configuration loaded:', config);
      } catch (err) {
        setError('Nepodařilo se načíst konfiguraci: ' + err.message);
        console.error('Configuration error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConfiguration();
  }, []);

  useEffect(() => {
    if (!configuration) return;

    const checkStatus = async () => {
      try {
        const currentStatus = await api.getStatus();
        setStatus(currentStatus);
        
        if (currentStatus.NewDataReady) {
          const measurementData = await api.getMeasurements();
          setMeasurements(measurementData.measuredStorage || []);
          
          measurementData.measuredStorage?.forEach(measurement => {
            const isValid = validators.validateMeasurement(measurement, configuration);
            if (!isValid) {
              console.warn('Invalid measurement detected:', measurement);
            }
          });
        }
      } catch (err) {
        console.error('Status check error:', err);
        setError('Chyba při načítání dat: ' + err.message);
      }
    };

    checkStatus();
    
    const interval = setInterval(checkStatus, 1000);
    
    return () => clearInterval(interval);
  }, [configuration]);

  const handleClearData = async () => {
    try {
      await api.clearMeasurements();
      setMeasurements([]);
      console.log('Data cleared');
    } catch (err) {
      setError('Nepodařilo se vymazat data: ' + err.message);
    }
  };

  const handleConfigChange = async (newConfig) => {
    try {
      const updatedConfig = await api.updateConfiguration(newConfig);
      setConfiguration(updatedConfig);
      console.log('Configuration updated:', updatedConfig);
    } catch (err) {
      setError('Nepodařilo se změnit konfiguraci: ' + err.message);
    }
  };

  if (loading) {
    return <div className="App">Načítání konfigurace...</div>;
  }

  if (error) {
    return (
      <div className="App">
        <div className="error">
          <h2>Chyba</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Obnovit stránku
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>GraphApp - Měření dat</h1>
      </header>

      <main>
        {/* Konfigurace */}
        <section className="config-section">
          <h2>Konfigurace</h2>
          {configuration && (
            <div className="config-display">
              <p><strong>Polarita:</strong> {configuration.Polarity}</p>
              <p><strong>Typ měření:</strong> {configuration.MeasurementValues}</p>
              <p><strong>Rozsah napětí:</strong> {configuration.MinVoltage}V - {configuration.MaxVoltage}V</p>
              <p><strong>Rozsah proudu:</strong> {configuration.MinCurrent}A - {configuration.MaxCurrent}A</p>
              <p><strong>Velikost bufferu:</strong> {configuration.BufferSize}</p>
            </div>
          )}
        </section>

        {/* Status */}
        <section className="status-section">
          <h2>Status</h2>
          {status && (
            <div className="status-display">
              <p><strong>Používaná polarita:</strong> {status.UsedPolarity}</p>
              <p><strong>Nová data:</strong> {status.NewDataReady ? '✅ Dostupná' : '❌ Nedostupná'}</p>
            </div>
          )}
        </section>

        {/* Měření */}
        <section className="measurements-section">
          <h2>Měření ({measurements.length})</h2>
          <button onClick={handleClearData} className="clear-button">
            Vymazat data
          </button>
          
          <div className="measurements-list">
            {measurements.length === 0 ? (
              <p>Žádná měření</p>
            ) : (
              measurements.slice(-5).reverse().map(measurement => (
                <div key={measurement.id} className="measurement-item">
                  <h4>Měření #{measurement.id}</h4>
                  <p><small>{new Date(measurement.timestamp).toLocaleString('cs-CZ')}</small></p>
                  
                  {measurement.measuredValues.map((value, index) => (
                    <div key={index} className="measured-values">
                      {value.posVoltage !== null && (
                        <span className="value">+U: {value.posVoltage}V</span>
                      )}
                      {value.posCurrent !== null && (
                        <span className="value">+I: {value.posCurrent}A</span>
                      )}
                      {value.negVoltage !== null && (
                        <span className="value">-U: {value.negVoltage}V</span>
                      )}
                      {value.negCurrent !== null && (
                        <span className="value">-I: {value.negCurrent}A</span>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;