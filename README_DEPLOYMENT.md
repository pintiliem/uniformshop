# Uniform Shop Appointment System

A full-stack web application for managing uniform shop appointments with Express.js backend and React frontend.

## Features

- Schedule appointments for uniform fittings
- View available time slots
- Admin panel to view all appointments
- SQLite database for data persistence

## Tech Stack

- **Backend**: Node.js, Express.js, SQLite3
- **Frontend**: React.js
- **Database**: SQLite

## Local Development

### Prerequisites
- Node.js (v14 or higher)
- npm

### Setup

1. Clone the repository
2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd client
   npm install
   ```

4. Start the backend server:
   ```bash
   npm start
   ```

5. Start the frontend development server:
   ```bash
   cd client
   npm start
   ```

The backend will run on http://localhost:3001 and the frontend on http://localhost:3000.

## Deployment on Render

This project is configured for deployment on Render using the `render.yaml` file.

### Automatic Deployment

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Connect your repository to Render
3. Render will automatically detect the `render.yaml` configuration
4. Both backend and frontend services will be deployed automatically

### Manual Deployment

If you prefer to deploy manually:

1. Create a new Web Service for the backend
2. Set the build command: `npm install`
3. Set the start command: `node index.js`
4. Add environment variables:
   - `NODE_ENV`: production
   - `PORT`: 10000

5. Create a new Static Site for the frontend
6. Set the build command: `cd client && npm install && npm run build`
7. Set the publish directory: `client/build`
8. Add environment variable:
   - `REACT_APP_API_URL`: Your backend service URL

## API Endpoints

- `POST /api/appointment` - Create a new appointment
- `POST /api/appointments` - Get all appointments
- `POST /api/appointments/counts` - Get appointment counts by date/time
- `POST /api/appointments/delete-all` - Delete all appointments (admin)
- `GET /api/appointments/count` - Get total appointment count

## Environment Variables

- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - SQLite database path
- `NODE_ENV` - Environment (development/production)
- `REACT_APP_API_URL` - Backend API URL for frontend 