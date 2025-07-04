import React, { useState, useEffect } from 'react';

// API base URL - use environment variable in production, localhost in development
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [childGrade, setChildGrade] = useState('');
  const [appointmentDates, setAppointmentDates] = useState([]);
  const [selectedHours, setSelectedHours] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const dateOptions = [
    { value: '2026-01-19', label: 'Jan 19' },
    { value: '2026-01-20', label: 'Jan 20' },
    { value: '2026-01-21', label: 'Jan 21' },
    { value: '2026-01-22', label: 'Jan 22' },
    { value: '2026-01-23', label: 'Jan 23' },
  ];

  // Generate time slots from 8:00 to 13:40 in 20 min steps (last slot ends at 14:00)
  const hourOptions = [];
  for (let h = 8; h < 14; h++) {
    for (let m = 0; m < 60; m += 20) {
      const hour = h.toString().padStart(2, '0');
      const min = m.toString().padStart(2, '0');
      const start = `${hour}:${min}`;
      // Only add slots that end at or before 14:00
      const endDate = new Date(2000, 0, 1, h, m + 20);
      if (endDate.getHours() > 14 || (endDate.getHours() === 14 && endDate.getMinutes() > 0)) continue;
      hourOptions.push({
        value: start,
        label: start
      });
    }
  }

  useEffect(() => {
    // Fetch all appointments on mount
    const fetchAppointments = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/appointments`, { method: 'POST' });
        const data = await res.json();
        setAppointments(Array.isArray(data) ? data : []);
      } catch {
        setAppointments([]);
      }
    };
    fetchAppointments();
    // Fetch total count
    const fetchCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/appointments/count`);
        const data = await res.json();
        setTotalCount(data.count);
      } catch {
        setTotalCount(0);
      }
    };
    fetchCount();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_name: parentName, email, child_name: childName, child_grade: childGrade, appointment_dates: appointmentDates, appointment_hours: selectedHours }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Appointment created!');
        setParentName('');
        setEmail('');
        setChildName('');
        setChildGrade('');
        setAppointmentDates([]);
        setSelectedHours([]);
        // Refresh appointments and count
        const fetchAppointments = async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/appointments`, { method: 'POST' });
            const data = await res.json();
            setAppointments(Array.isArray(data) ? data : []);
          } catch {
            setAppointments([]);
          }
        };
        const fetchCount = async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/appointments/count`);
            const data = await res.json();
            setTotalCount(data.count);
          } catch {
            setTotalCount(0);
          }
        };
        fetchAppointments();
        fetchCount();
      } else {
        setMessage(data.error || 'Error creating appointment.');
      }
    } catch (err) {
      setMessage('Network error.');
    }
    setLoading(false);
  };

  // Helper to get next time interval
  function getNextTime(time) {
    const [h, m] = time.split(':').map(Number);
    let date = new Date(2000, 0, 1, h, m);
    date.setMinutes(date.getMinutes() + 20);
    return date.toTimeString().slice(0, 5);
  }

  return (
    <>
      <div style={{ maxWidth: 600, margin: '2rem auto', padding: 20, border: '1px solid #ccc', borderRadius: 8, background: 'navy', color: 'white' }}>
        <img src="https://wesspandc.org/wp-content/uploads/2022/07/Logo.jpg" alt="WESS P&C Logo" style={{ display: 'block', margin: '0 auto 16px', maxWidth: 180, height: 'auto' }} />
        <h2>WESS P&C Uniform Fitting</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 20, width: '100%' }}>
          <div style={{ display: 'flex', gap: 24, width: '100%' }}>
            <div style={{ flex: 1 }}>
              <label>Parent Name *</label><br />
              <input
                type="text"
                value={parentName}
                onChange={e => setParentName(e.target.value)}
                required
                style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Email *</label><br />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, width: '100%' }}>
            <div style={{ flex: 1 }}>
              <label>Child Name</label><br />
              <input
                type="text"
                value={childName}
                onChange={e => setChildName(e.target.value)}
                style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Child Grade</label><br />
              <select
                value={childGrade}
                onChange={e => setChildGrade(e.target.value)}
                style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
              >
                <option value="">Select grade</option>
                <option value="Prep">Prep</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
              </select>
            </div>
          </div>
          <div style={{ width: '100%' }}>
            <label>Select date *</label><br />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {dateOptions.map(opt => {
                // Parse date for display
                const dateObj = new Date(opt.value);
                const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                const day = dateObj.getDate();
                const weekday = dateObj.toLocaleString('en-US', { weekday: 'short' });
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAppointmentDates([opt.value])}
                    style={{
                      padding: 0,
                      borderRadius: 8,
                      border: appointmentDates.includes(opt.value) ? '2px solid #6c63ff' : '1px solid #fff',
                      background: appointmentDates.includes(opt.value) ? '#fff' : 'navy',
                      color: appointmentDates.includes(opt.value) ? '#253b8a' : '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                      minWidth: 60,
                      width: 60,
                      height: 70,
                      margin: '0 4px',
                      boxShadow: appointmentDates.includes(opt.value) ? '0 2px 8px #6c63ff22' : '0 1px 2px #0001',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1.1,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, background: '#253b8a', color: '#fff', width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8, padding: '2px 0' }}>{month}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: appointmentDates.includes(opt.value) ? '#253b8a' : '#fff', margin: '2px 0' }}>{day}</div>
                    <div style={{ fontSize: 13, color: appointmentDates.includes(opt.value) ? '#253b8a' : '#fff', marginBottom: 2 }}>{weekday}</div>
                  </button>
                );
              })}
            </div>
            {appointmentDates.length === 0 && <div style={{ color: '#ffbaba', marginTop: 4 }}>Please select a date.</div>}
          </div>
          {appointmentDates.length > 0 && (
            <div style={{ width: '100%' }}>
              <label>Hour(s) *</label><br />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {Array.from({ length: Math.ceil(hourOptions.length / 3) }).map((_, rowIdx) => (
                  <div key={rowIdx} style={{ display: 'flex', gap: 8 }}>
                    {hourOptions.slice(rowIdx * 3, rowIdx * 3 + 3).map(opt => {
                      const isDisabled = opt.value === '12:40';
                      const interval = `${opt.label}-${getNextTime(opt.value)}`;
                      return (
                        <div key={opt.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
                          <div style={{ fontSize: 13, marginBottom: 4 }}>{interval}</div>
                          {[1, 2].map(room => {
                            const roomKey = `${opt.value}-room${room}`;
                            // Check if this room is already booked for the selected date and time-room
                            let roomTaken = false;
                            if (appointments && appointmentDates.length === 1) {
                              roomTaken = appointments.some(appt => {
                                const apptDates = Array.isArray(appt.appointment_dates) ? appt.appointment_dates : [];
                                const apptHours = Array.isArray(appt.appointment_hours) ? appt.appointment_hours : [];
                                return apptDates.includes(appointmentDates[0]) && apptHours.includes(roomKey);
                              });
                            }
                            return (
                              <button
                                key={roomKey}
                                type="button"
                                disabled={isDisabled || roomTaken}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #fff',
                                  background: selectedHours.includes(roomKey)
                                    ? '#fff'
                                    : 'navy',
                                  color: roomTaken
                                    ? '#ff6666'
                                    : selectedHours.includes(roomKey)
                                      ? 'navy'
                                      : '#fff',
                                  fontWeight: 600,
                                  cursor: isDisabled || roomTaken ? 'not-allowed' : 'pointer',
                                  outline: 'none',
                                  minWidth: 60,
                                  width: 90,
                                  marginBottom: 2,
                                  opacity: isDisabled || roomTaken ? 0.6 : 1,
                                  whiteSpace: 'nowrap',
                                }}
                                onClick={() => {
                                  if (isDisabled || roomTaken) return;
                                  setSelectedHours(hours =>
                                    hours.includes(roomKey)
                                      ? hours.filter(h => h !== roomKey)
                                      : [...hours, roomKey]
                                  );
                                }}
                              >
                                Room {room}{roomTaken ? ' Full' : ''}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {selectedHours.length === 0 && <div style={{ color: '#ffbaba', marginTop: 4 }}>Please select at least one hour.</div>}
            </div>
          )}
          <button type="submit" disabled={loading || appointmentDates.length === 0 || selectedHours.length === 0} style={{ padding: '8px 16px', width: '100%' }}>
            {loading ? 'Submitting...' : 'Book Appointment'}
          </button>
        </form>
        {message && <div style={{ marginTop: 16 }}>{message}</div>}
      </div>
      {/* Appointments List */}
      <div style={{ maxWidth: 600, margin: '2rem auto', padding: 20, background: '#fff', color: '#222', borderRadius: 8 }}>
        <h3>Existing Appointments</h3>
        <div style={{ marginBottom: 12 }}><b>Total Appointments:</b> {totalCount}</div>
        {appointments.length === 0 ? (
          <div>No appointments found.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {appointments.map(appt => (
              <li key={appt.id} style={{ marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                <div><b>Parent:</b> {appt.parent_name}</div>
                <div><b>Child:</b> {appt.child_name || '-'} <b>Grade:</b> {appt.child_grade || '-'}</div>
                <div><b>Dates:</b> {Array.isArray(appt.appointment_dates) ? appt.appointment_dates.join(', ') : appt.appointment_dates}</div>
                <div><b>Hours:</b> {Array.isArray(appt.appointment_hours) ? appt.appointment_hours.join(', ') : appt.appointment_hours}</div>
              </li>
            ))}
          </ul>
        )}
    </div>
    </>
  );
}

export default App;
