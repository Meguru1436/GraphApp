const express = require('express');
const sqlite3 = require('sqlite3').verbose(); 
const app = express();


const db = new sqlite3.Database('./measurements.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        process.exit(1); 
    }
    console.log('Connected to the SQLite database: measurements.db');
});


db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL
        )
    `, (err) => {
        if (err) console.error('Error creating measurements table:', err.message);
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS measurement_values (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            measurement_id INTEGER NOT NULL,
            pos_voltage REAL,
            pos_current REAL,
            neg_voltage REAL,
            neg_current REAL,
            FOREIGN KEY (measurement_id) REFERENCES measurements(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Error creating measurement_values table:', err.message);
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            min_voltage REAL NOT NULL,
            max_voltage REAL NOT NULL,
            min_current REAL NOT NULL,
            max_current REAL NOT NULL,
            polarity TEXT NOT NULL,
            measurement_values TEXT NOT NULL,
            buffer_size INTEGER NOT NULL
        )
    `, (err) => {
        if (err) console.error('Error creating config table:', err.message);
        // Vlož nebo aktualizuj výchozí konfiguraci, pokud tabulka config existuje
        db.run(`
            INSERT INTO config (id, min_voltage, max_voltage, min_current, max_current, polarity, measurement_values, buffer_size)
            VALUES (1, 100, 1000, 5, 20, 'bipolar', 'both', 25)
            ON CONFLICT(id) DO UPDATE SET
               min_voltage = EXCLUDED.min_voltage,
               max_voltage = EXCLUDED.max_voltage,
               min_current = EXCLUDED.min_current,
               max_current = EXCLUDED.max_current,
               polarity = EXCLUDED.polarity,
               measurement_values = EXCLUDED.measurement_values,
               buffer_size = EXCLUDED.buffer_size;
        `, (err) => {
            if (err) console.error('Error inserting/updating config:', err.message);
            // Po inicializaci configu načti ho do proměnné config
            db.get("SELECT * FROM config WHERE id = 1", [], (err, row) => {
                if (err) {
                    console.error('Error loading config from DB:', err.message);
                } else if (row) {
                    // Přemapování z DB názvů na JS objekty
                    config.MinVoltage = row.min_voltage;
                    config.MaxVoltage = row.max_voltage;
                    config.MinCurrent = row.min_current;
                    config.MaxCurrent = row.max_current;
                    config.Polarity = row.polarity;
                    config.MeasurementValues = row.measurement_values;
                    config.BufferSize = row.buffer_size;
                    console.log('Config loaded from DB:', config);
                }
            });
        });
    });
});

let config = {
    MinVoltage: 0, 
    MaxVoltage: 0, 
    MinCurrent: 0, 
    MaxCurrent: 0, 
    Polarity: "", 
    MeasurementValues: "", 
    BufferSize: 0 
};


let lastPosVoltage = 0; 
let lastPosCurrent = 0; 
let lastNegVoltage = 0; 
let lastNegCurrent = 0; 


db.get("SELECT * FROM config WHERE id = 1", [], (err, row) => {
    if (err) {
        console.error('Error loading config for initial last values:', err.message);
    } else if (row) {
        lastPosVoltage = row.min_voltage + (row.max_voltage - row.min_voltage) / 2;
        lastPosCurrent = row.min_current + (row.max_current - row.min_current) / 2;
        lastNegVoltage = -(row.min_voltage + (row.max_voltage - row.min_voltage) / 2);
        lastNegCurrent = -(row.min_current + (row.max_current - row.min_current) / 2);
        console.log('Initial measurement values set.');
    }
});


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


app.get("/measurements", async (req, res) => {
    if (shouldGenerateNewData) {
        const newMeasurement = generateMeasurement(config.Polarity, config.MeasurementValues);

        db.run('INSERT INTO measurements (timestamp) VALUES (?)', [newMeasurement.timestamp], function(err) {
            if (err) {
                console.error('Error inserting new measurement:', err.message);
                return res.status(500).json({ error: 'Database error' });
            }
            const insertedMeasurementId = this.lastID; 

            const stmt = db.prepare('INSERT INTO measurement_values (measurement_id, pos_voltage, pos_current, neg_voltage, neg_current) VALUES (?, ?, ?, ?, ?)');
            newMeasurement.measuredValues.forEach(value => {
                stmt.run(insertedMeasurementId, value.posVoltage, value.posCurrent, value.negVoltage, value.negCurrent, (err) => {
                    if (err) {
                        console.error('Error inserting measurement value:', err.message);
                    }
                });
            });
            stmt.finalize(); 

            shouldGenerateNewData = false;
        });
    }

    const limit = config.BufferSize;

    db.all(`
        SELECT
            m.id,
            m.timestamp,
            mv.pos_voltage,
            mv.pos_current,
            mv.neg_voltage,
            mv.neg_current
        FROM measurements AS m
        JOIN measurement_values AS mv ON m.id = mv.measurement_id
        ORDER BY m.timestamp DESC, mv.id ASC
        LIMIT ?
    `, [limit], (err, rows) => {
        if (err) {
            console.error('Error fetching measurements from DB:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }

        const measuredStorage = [];
        let currentMeasurement = null;
        rows.forEach(row => {
            if (!groupedMeasurements[row.id]) {
                groupedMeasurements[row.id] = {
                    id: row.id,
                    timestamp: row.timestamp,
                    measuredValues: []
                };
            }
            groupedMeasurements[row.id].measuredValues.push({
                posVoltage: row.pos_voltage,
                posCurrent: row.pos_current,
                negVoltage: row.neg_voltage,
                negCurrent: row.neg_current
            });
        });
        const sortedKeys = Object.keys(groupedMeasurements).sort((a, b) => {
            return new Date(groupedMeasurements[b].timestamp) - new Date(groupedMeasurements[a].timestamp);
        });
        const finalMeasuredStorage = [];
        for (let i = 0; i < sortedKeys.length && finalMeasuredStorage.length < limit; i++) {
            finalMeasuredStorage.push(groupedMeasurements[sortedKeys[i]]);
        }

        res.json({ measuredStorage: finalMeasuredStorage.reverse() }); 
    });
});


app.listen(5000, () => {
    console.log("Server is running on port 5000");
});

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});