const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3001;

// Configure CORS to allow requests from your frontend domain
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://uniformshop.onrender.com', 'https://uniformshop-be.onrender.com']
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(process.env.DATABASE_URL || './appointments.db', (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

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

// Create appointment endpoint
app.post('/api/appointment', (req, res) => {
  const { parent_name, email, child_name, child_grade, appointment_dates, appointment_hours } = req.body;
  if (!parent_name || !email) {
    return res.status(400).json({ error: 'Parent name and email are required.' });
  }
  if (!Array.isArray(appointment_dates) || appointment_dates.length === 0 || !Array.isArray(appointment_hours) || appointment_hours.length === 0) {
    return res.status(400).json({ error: 'At least one date and one hour must be selected.' });
  }
  // Enforce max one appointment per date and time-room
  const checks = [];
  appointment_dates.forEach(date => {
    appointment_hours.forEach(hourRoom => {
      checks.push(new Promise((resolve, reject) => {
        db.all(
          'SELECT appointment_dates, appointment_hours FROM appointments',
          [],
          (err, rows) => {
            if (err) return reject(err);
            let taken = false;
            rows.forEach(row => {
              let apptDates = [];
              let apptHours = [];
              try { apptDates = JSON.parse(row.appointment_dates); } catch {}
              try { apptHours = JSON.parse(row.appointment_hours); } catch {}
              if (apptDates.includes(date) && apptHours.includes(hourRoom)) {
                taken = true;
              }
            });
            resolve(taken);
          }
        );
      }));
    });
  });
  Promise.all(checks).then(results => {
    if (results.some(taken => taken)) {
      return res.status(400).json({ error: 'One or more selected slots are already taken.' });
    }
    const stmt = db.prepare('INSERT INTO appointments (parent_name, email, child_name, child_grade, appointment_dates, appointment_hours) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(
      parent_name,
      email,
      child_name || '',
      child_grade || '',
      JSON.stringify(appointment_dates),
      JSON.stringify(appointment_hours),
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create appointment.' });
        }
        res.status(201).json({ id: this.lastID, parent_name, email, child_name, child_grade, appointment_dates, appointment_hours });
      }
    );
    stmt.finalize();
  }).catch(() => res.status(500).json({ error: 'Failed to check slot availability.' }));
});

// List all appointments endpoint
app.post('/api/appointments', (req, res) => {
  db.all('SELECT id, parent_name, email, child_name, child_grade, appointment_dates, appointment_hours, created_at FROM appointments ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch appointments.' });
    }
    // Parse JSON fields for frontend
    rows.forEach(row => {
      try { row.appointment_dates = JSON.parse(row.appointment_dates); } catch { row.appointment_dates = []; }
      try { row.appointment_hours = JSON.parse(row.appointment_hours); } catch { row.appointment_hours = []; }
    });
    res.json(rows);
  });
});

// Endpoint to get appointment counts for each date/hour
app.post('/api/appointments/counts', (req, res) => {
  const { dates, hours } = req.body;
  if (!Array.isArray(dates) || !Array.isArray(hours)) {
    return res.status(400).json({ error: 'dates and hours must be arrays.' });
  }
  // Query all appointments
  db.all('SELECT appointment_dates, appointment_hours FROM appointments', [], (err, rows) => {
    if (err) {
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
  });
});

// Endpoint to delete all appointments (for admin/testing)
app.post('/api/appointments/delete-all', (req, res) => {
  db.run('DELETE FROM appointments', [], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete appointments.' });
    }
    res.json({ success: true });
  });
});

// Endpoint to get total number of appointments
app.get('/api/appointments/count', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM appointments', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch count.' });
    }
    res.json({ count: row.count });
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}); 