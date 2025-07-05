const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

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

// Initialize PostgreSQL database
console.log('Attempting to connect to PostgreSQL database...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  } else {
    console.log('Connected to PostgreSQL database successfully');
    
    // Create table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        parent_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        child_name VARCHAR(255),
        child_grade VARCHAR(50),
        appointment_dates TEXT,
        appointment_hours TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    pool.query(createTableQuery, (err, res) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('Database table created/verified successfully');
      }
    });
  }
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
  
  // Check for conflicts first
  pool.query('SELECT appointment_dates, appointment_hours FROM appointments', (err, result) => {
    if (err) {
      console.error('Error checking appointments:', err);
      return res.status(500).json({ error: 'Failed to check slot availability.' });
    }
    
    let taken = false;
    for (const row of result.rows) {
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
    
    // Insert the appointment
    const insertQuery = `
      INSERT INTO appointments (parent_name, email, child_name, child_grade, appointment_dates, appointment_hours)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    pool.query(insertQuery, [
      parent_name,
      email,
      child_name || '',
      child_grade || '',
      JSON.stringify(appointment_dates),
      JSON.stringify(appointment_hours)
    ], (err, result) => {
      if (err) {
        console.error('Error creating appointment:', err);
        return res.status(500).json({ error: 'Failed to create appointment.' });
      }
      
      res.status(201).json({ 
        id: result.rows[0].id, 
        parent_name, 
        email, 
        child_name, 
        child_grade, 
        appointment_dates, 
        appointment_hours 
      });
    });
  });
});

// List all appointments endpoint
app.post('/api/appointments', (req, res) => {
  const query = 'SELECT id, parent_name, email, child_name, child_grade, appointment_dates, appointment_hours, created_at FROM appointments ORDER BY created_at DESC';
  
  pool.query(query, (err, result) => {
    if (err) {
      console.error('Error fetching appointments:', err);
      return res.status(500).json({ error: 'Failed to fetch appointments.' });
    }
    
    const rows = result.rows.map(row => ({
      ...row,
      appointment_dates: (() => {
        try { return JSON.parse(row.appointment_dates); } catch { return []; }
      })(),
      appointment_hours: (() => {
        try { return JSON.parse(row.appointment_hours); } catch { return []; }
      })()
    }));
    
    res.json(rows);
  });
});

// Endpoint to get appointment counts for each date/hour
app.post('/api/appointments/counts', (req, res) => {
  const { dates, hours } = req.body;
  if (!Array.isArray(dates) || !Array.isArray(hours)) {
    return res.status(400).json({ error: 'dates and hours must be arrays.' });
  }
  
  pool.query('SELECT appointment_dates, appointment_hours FROM appointments', (err, result) => {
    if (err) {
      console.error('Error fetching appointment counts:', err);
      return res.status(500).json({ error: 'Failed to fetch appointments.' });
    }
    
    // Build count map
    const counts = {};
    dates.forEach(date => {
      counts[date] = {};
      hours.forEach(hour => {
        counts[date][hour] = 0;
      });
    });
    
    result.rows.forEach(row => {
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
  });
});

// Endpoint to delete all appointments (for admin/testing)
app.post('/api/appointments/delete-all', (req, res) => {
  pool.query('DELETE FROM appointments', (err, result) => {
    if (err) {
      console.error('Error deleting appointments:', err);
      return res.status(500).json({ error: 'Failed to delete appointments.' });
    }
    res.json({ success: true, deletedCount: result.rowCount });
  });
});

// Endpoint to get total number of appointments
app.get('/api/appointments/count', (req, res) => {
  pool.query('SELECT COUNT(*) as count FROM appointments', (err, result) => {
    if (err) {
      console.error('Error fetching appointment count:', err);
      return res.status(500).json({ error: 'Failed to fetch count.' });
    }
    res.json({ count: parseInt(result.rows[0].count) });
  });
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