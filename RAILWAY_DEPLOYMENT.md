# Railway Deployment Guide

This guide will help you deploy your Uniform Shop application to Railway.

## Prerequisites

1. A Railway account (sign up at [railway.app](https://railway.app))
2. Git repository with your code
3. Railway CLI (optional but recommended)

## Deployment Steps

### 1. Backend Deployment

1. **Create a new Railway project:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure the backend service:**
   - Railway will automatically detect this as a Node.js project
   - Set the following environment variables in Railway dashboard:
     ```
     NODE_ENV=production
     FRONTEND_URL=https://your-frontend-service-name.up.railway.app
     ```

3. **Deploy the backend:**
   - Railway will automatically deploy when you push to your main branch
   - The backend will be available at: `https://your-backend-service-name.up.railway.app`

### 2. Frontend Deployment

1. **Create a separate service for the frontend:**
   - In your Railway project, click "New Service"
   - Select "GitHub Repo"
   - Choose the same repository
   - Set the source directory to `client`

2. **Configure the frontend service:**
   - Set the following environment variables:
     ```
     REACT_APP_API_URL=https://your-backend-service-name.up.railway.app
     NODE_ENV=production
     ```

3. **Deploy the frontend:**
   - Railway will automatically build and deploy the React app
   - The frontend will be available at: `https://your-frontend-service-name.up.railway.app`

## Environment Variables

### Backend Environment Variables
- `NODE_ENV`: Set to `production` for production deployment
- `FRONTEND_URL`: The URL of your frontend service
- `PORT`: Railway automatically sets this (usually 3000)

### Frontend Environment Variables
- `REACT_APP_API_URL`: The URL of your backend service
- `NODE_ENV`: Set to `production` for production deployment

## Database Configuration

The application uses SQLite for local development. For production, you may want to:

1. **Use Railway's PostgreSQL service:**
   - Add a PostgreSQL service to your Railway project
   - Update the backend to use PostgreSQL instead of SQLite
   - Set the `DATABASE_URL` environment variable

2. **Or continue with SQLite:**
   - The current setup will work with Railway's ephemeral storage
   - Note: Data will be lost on service restarts

## Custom Domains

1. **Add custom domain:**
   - In Railway dashboard, go to your service
   - Click "Settings" → "Domains"
   - Add your custom domain
   - Update DNS records as instructed

2. **Update environment variables:**
   - Update `FRONTEND_URL` with your custom domain
   - Update `REACT_APP_API_URL` with your backend custom domain

## Monitoring and Logs

- **View logs:** In Railway dashboard, go to your service and click "Logs"
- **Monitor performance:** Railway provides built-in monitoring
- **Health checks:** The app includes health check endpoints

## Troubleshooting

### Common Issues

1. **CORS errors:**
   - Ensure `FRONTEND_URL` is correctly set in backend environment variables
   - Check that the frontend URL matches exactly

2. **Database connection issues:**
   - Verify `DATABASE_URL` is set correctly
   - Check that the database service is running

3. **Build failures:**
   - Check the build logs in Railway dashboard
   - Ensure all dependencies are in `package.json`

### Support

- Railway documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)

## Local Development

To test locally with Railway environment:

1. **Backend:**
   ```bash
   cd /path/to/your/project
   npm install
   npm run dev
   ```

2. **Frontend:**
   ```bash
   cd client
   npm install
   npm start
   ```

3. **Set environment variables locally:**
   ```bash
   # Backend
   export NODE_ENV=development
   export FRONTEND_URL=http://localhost:3000
   
   # Frontend
   export REACT_APP_API_URL=http://localhost:3001
   ``` 