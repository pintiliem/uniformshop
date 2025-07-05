const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

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
const dbPath = process.env.DATABASE_URL || './appointments.db';
console.log('Database path:', dbPath);

let db;
try {
  db = new Database(dbPath);
  console.log('Connected to SQLite database successfully');
  
  // Create table if it doesn't exist
  db.exec(`CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_name TEXT NOT NULL,
    email TEXT NOT NULL,
    child_name TEXT,
    child_grade TEXT,
    appointment_dates TEXT,
    appointment_hours TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
} catch (error) {
  console.error('Failed to initialize SQLite database:', error);
  console.error('This might be due to missing build tools or incompatible binary');
  process.exit(1);
}

// Create appointment endpoint
app.post('/api/appointment', (req, res) => {
  const { parent_name, email, child_name, child_grade, appointment_dates, appointment_hours } = req.body;
  if (!parent_name || !email) {
    return res.status(400).json({ error: 'Parent name and email are required.' });
  }
  if (!Array.isArray(appointment_dates) || appointment_dates.length === 0 || !Array.isArray(appointment_hours) || appointment_hours.length === 0) {
    return res.status(400).json({ error: 'At least one date and one hour must be selected.' });
  }
  
  try {
    // Enforce max one appointment per date and time-room
    const rows = db.prepare('SELECT appointment_dates, appointment_hours FROM appointments').all();
    let taken = false;
    
    for (const row of rows) {
      let apptDates = [];
      let apptHours = [];
      try { apptDates = JSON.parse(row.appointment_dates); } catch {}
      try { apptHours = JSON.parse(row.appointment_hours); } catch {}
      
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
    
    if (taken) {
      return res.status(400).json({ error: 'One or more selected slots are already taken.' });
    }
    
    const stmt = db.prepare('INSERT INTO appointments (parent_name, email, child_name, child_grade, appointment_dates, appointment_hours) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(
      parent_name,
      email,
      child_name || '',
      child_grade || '',
      JSON.stringify(appointment_dates),
      JSON.stringify(appointment_hours)
    );
    
    res.status(201).json({ 
      id: result.lastInsertRowid, 
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
  try {
    const rows = db.prepare('SELECT id, parent_name, email, child_name, child_grade, appointment_dates, appointment_hours, created_at FROM appointments ORDER BY created_at DESC').all();
    
    // Parse JSON fields for frontend
    rows.forEach(row => {
      try { row.appointment_dates = JSON.parse(row.appointment_dates); } catch { row.appointment_dates = []; }
      try { row.appointment_hours = JSON.parse(row.appointment_hours); } catch { row.appointment_hours = []; }
    });
    
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
  
  try {
    // Query all appointments
    const rows = db.prepare('SELECT appointment_dates, appointment_hours FROM appointments').all();
    
    // Build count map
    const counts = {};
    dates.forEach(date => {
      counts[date] = {};
      hours.forEach(hour => {
        counts[date][hour] = 0;
      });
    });
    
    rows.forEach(row => {
      let apptDates = [];
      let apptHours = [];
      try { apptDates = JSON.parse(row.appointment_dates); } catch {}
      try { apptHours = JSON.parse(row.appointment_hours); } catch {}
      apptDates.forEach(date => {
        apptHours.forEach(hour => {
          if (counts[date] && counts[date][hour] !== undefined) {
            counts[date][hour]++;
          }
        });
      });
    });
    
    res.json(counts);
  } catch (error) {
    console.error('Error fetching appointment counts:', error);
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// Endpoint to delete all appointments (for admin/testing)
app.post('/api/appointments/delete-all', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM appointments').run();
    res.json({ success: true, deletedCount: result.changes });
  } catch (error) {
    console.error('Error deleting appointments:', error);
    res.status(500).json({ error: 'Failed to delete appointments.' });
  }
});

// Endpoint to get total number of appointments
app.get('/api/appointments/count', (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM appointments').get();
    res.json({ count: row.count });
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