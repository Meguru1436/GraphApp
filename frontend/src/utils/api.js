import apiSchema from '../api-schema.json';

const API_BASE = 'http://localhost:5000';

export const api = {
  getConfiguration: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/configuration`);
      if (!response.ok) throw new Error('Failed to fetch configuration');
      return await response.json();
    } catch (error) {
      console.error('Error fetching configuration:', error);
      throw error;
    }
  },

  getStatus: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/status`);
      if (!response.ok) throw new Error('Failed to fetch status');
      return await response.json();
    } catch (error) {
      console.error('Error fetching status:', error);
      throw error;
    }
  },

  getMeasurements: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/measurements`);
      if (!response.ok) throw new Error('Failed to fetch measurements');
      return await response.json();
    } catch (error) {
      console.error('Error fetching measurements:', error);
      throw error;
    }
  },

  updateConfiguration: async (newConfig) => {
    try {
      const response = await fetch(`${API_BASE}/api/configuration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig)
      });
      if (!response.ok) throw new Error('Failed to update configuration');
      return await response.json();
    } catch (error) {
      console.error('Error updating configuration:', error);
      throw error;
    }
  },

  clearMeasurements: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/measurements`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to clear measurements');
      return await response.json();
    } catch (error) {
      console.error('Error clearing measurements:', error);
      throw error;
    }
  }
};

export const validators = {
  isValidPolarity: (polarity) => {
    return apiSchema.validation_rules.polarity_values.includes(polarity);
  },

  isValidMeasurementType: (type) => {
    return apiSchema.validation_rules.measurement_values.includes(type);
  },

  validateMeasurement: (measurement, config) => {
    const { Polarity, MeasurementValues } = config;
    
    return measurement.measuredValues.every(value => {
      if (Polarity === 'unipolar') {
        if (value.negVoltage !== null || value.negCurrent !== null) {
          return false;
        }
      }
      
      if (MeasurementValues === 'voltage') {
        if (value.posCurrent !== null || value.negCurrent !== null) {
          return false;
        }
      }
      
      if (MeasurementValues === 'current') {
        if (value.posVoltage !== null || value.negVoltage !== null) {
          return false;
        }
      }
      
      return true;
    });
  }
};

export const usePolling = (callback, interval = 1000, condition = true) => {
  const [isPolling, setIsPolling] = React.useState(false);
  
  React.useEffect(() => {
    if (!condition) return;
    
    setIsPolling(true);
    const timer = setInterval(callback, interval);
    
    return () => {
      clearInterval(timer);
      setIsPolling(false);
    };
  }, [callback, interval, condition]);
  
  return isPolling;
};