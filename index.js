const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');

const app = express();
const port = process.env.PORT || 3001;

// Add comprehensive debugging for Railway deployment
console.log('Starting server with configuration:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

// Add a simple health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: port,
    nodeEnv: process.env.NODE_ENV
  });
});

// Add a root endpoint for basic connectivity testing
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Uniform Shop API is running',
    timestamp: new Date().toISOString(),
    port: port
  });
});

// Configure CORS to allow requests from your frontend domain
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://uniformshop-production.up.railway.app']
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Initialize SQLite database
console.log('Attempting to connect to database...');

let db;
let SQL;

// Initialize sql.js
initSqlJs({
  locateFile: file => `https://sql.js.org/dist/${file}`
}).then(function(sql) {
  SQL = sql;
  console.log('SQL.js initialized successfully');
  
  // Create in-memory database for Railway deployment
  db = new SQL.Database();
  console.log('Connected to in-memory SQLite database');
  
  // Create table if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_name TEXT NOT NULL,
    email TEXT NOT NULL,
    child_name TEXT,
    child_grade TEXT,
    appointment_dates TEXT,
    appointment_hours TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  console.log('Database table created successfully');
}).catch(function(err) {
  console.error('Failed to initialize SQL.js:', err);
  process.exit(1);
});

// Create appointment endpoint
app.post('/api/appointment', (req, res) => {
  const { parent_name, email, child_name, child_grade, appointment_dates, appointment_hours } = req.body;
  if (!parent_name || !email) {
    return res.status(400).json({ error: 'Parent name and email are required.' });
  }
  if (!Array.isArray(appointment_dates) || appointment_dates.length === 0 || !Array.isArray(appointment_hours) || appointment_hours.length === 0) {
    return res.status(400).json({ error: 'At least one date and one hour must be selected.' });
  }
  
  if (!db) {
    return res.status(503).json({ error: 'Database not initialized yet.' });
  }
  
  try {
    // Enforce max one appointment per date and time-room
    const result = db.exec('SELECT appointment_dates, appointment_hours FROM appointments');
    let taken = false;
    
    if (result.length > 0) {
      const rows = result[0].values;
      for (const row of rows) {
        let apptDates = [];
        let apptHours = [];
        try { apptDates = JSON.parse(row[0]); } catch {}
        try { apptHours = JSON.parse(row[1]); } catch {}
        
        for (const date of appointment_dates) {
          for (const hourRoom of appointment_hours) {
            if (apptDates.includes(date) && apptHours.includes(hourRoom)) {
              taken = true;
              break;
            }
          }
          if (taken) break;
        }
        if (taken) break;
      }
    }
    
    if (taken) {
      return res.status(400).json({ error: 'One or more selected slots are already taken.' });
    }
    
    const stmt = db.prepare('INSERT INTO appointments (parent_name, email, child_name, child_grade, appointment_dates, appointment_hours) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run([
      parent_name,
      email,
      child_name || '',
      child_grade || '',
      JSON.stringify(appointment_dates),
      JSON.stringify(appointment_hours)
    ]);
    stmt.free();
    
    // Get the inserted ID
    const idResult = db.exec('SELECT last_insert_rowid()');
    const id = idResult[0].values[0][0];
    
    res.status(201).json({ 
      id: id, 
      parent_name, 
      email, 
      child_name, 
      child_grade, 
      appointment_dates, 
      appointment_hours 
    });
    
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment.' });
  }
});

// List all appointments endpoint
app.post('/api/appointments', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not initialized yet.' });
  }
  
  try {
    const result = db.exec('SELECT id, parent_name, email, child_name, child_grade, appointment_dates, appointment_hours, created_at FROM appointments ORDER BY created_at DESC');
    
    if (result.length === 0) {
      return res.json([]);
    }
    
    const rows = result[0].values.map(row => ({
      id: row[0],
      parent_name: row[1],
      email: row[2],
      child_name: row[3],
      child_grade: row[4],
      appointment_dates: (() => {
        try { return JSON.parse(row[5]); } catch { return []; }
      })(),
      appointment_hours: (() => {
        try { return JSON.parse(row[6]); } catch { return []; }
      })(),
      created_at: row[7]
    }));
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// Endpoint to get appointment counts for each date/hour
app.post('/api/appointments/counts', (req, res) => {
  const { dates, hours } = req.body;
  if (!Array.isArray(dates) || !Array.isArray(hours)) {
    return res.status(400).json({ error: 'dates and hours must be arrays.' });
  }
  
  if (!db) {
    return res.status(503).json({ error: 'Database not initialized yet.' });
  }
  
  try {
    // Query all appointments
    const result = db.exec('SELECT appointment_dates, appointment_hours FROM appointments');
    
    // Build count map
    const counts = {};
    dates.forEach(date => {
      counts[date] = {};
      hours.forEach(hour => {
        counts[date][hour] = 0;
      });
    });
    
    if (result.length > 0) {
      const rows = result[0].values;
      rows.forEach(row => {
        let apptDates = [];
        let apptHours = [];
        try { apptDates = JSON.parse(row[0]); } catch {}
        try { apptHours = JSON.parse(row[1]); } catch {}
        apptDates.forEach(date => {
          apptHours.forEach(hour => {
            if (counts[date] && counts[date][hour] !== undefined) {
              counts[date][hour]++;
            }
          });
        });
      });
    }
    
    res.json(counts);
  } catch (error) {
    console.error('Error fetching appointment counts:', error);
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// Endpoint to delete all appointments (for admin/testing)
app.post('/api/appointments/delete-all', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not initialized yet.' });
  }
  
  try {
    db.run('DELETE FROM appointments');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointments:', error);
    res.status(500).json({ error: 'Failed to delete appointments.' });
  }
});

// Endpoint to get total number of appointments
app.get('/api/appointments/count', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not initialized yet.' });
  }
  
  try {
    const result = db.exec('SELECT COUNT(*) as count FROM appointments');
    const count = result.length > 0 ? result[0].values[0][0] : 0;
    res.json({ count: count });
  } catch (error) {
    console.error('Error fetching appointment count:', error);
    res.status(500).json({ error: 'Failed to fetch count.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check available at: http://localhost:${port}/health`);
  console.log(`API root available at: http://localhost:${port}/`);
});

// Add error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
}); 