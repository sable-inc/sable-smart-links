# Deploying to Vercel

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **MongoDB Atlas**: Set up a MongoDB Atlas cluster
3. **Vercel CLI** (optional): `npm i -g vercel`

## Environment Variables

Set these in your Vercel dashboard:

- `MONGODB_URI`: Your MongoDB Atlas connection string
- `NODE_ENV`: `production`
- `PORT`: `3001` (optional, Vercel handles this)

## Deployment Steps

### Option 1: Vercel Dashboard (Recommended)

1. **Connect Repository**:

   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Set the root directory to `api/`

2. **Configure Environment Variables**:

   - In the project settings, go to "Environment Variables"
   - Add your `MONGODB_URI` and other variables

3. **Deploy**:
   - Vercel will automatically detect the Node.js app
   - Click "Deploy"

### Option 2: Vercel CLI

1. **Install CLI**:

   ```bash
   npm i -g vercel
   ```

2. **Login**:

   ```bash
   vercel login
   ```

3. **Deploy**:

   ```bash
   cd api
   vercel
   ```

4. **Set Environment Variables**:
   ```bash
   vercel env add MONGODB_URI
   vercel env add NODE_ENV
   ```

## API Endpoints

Your API will be available at:

- `https://your-project.vercel.app/health`
- `https://your-project.vercel.app/api/keys/:clientKey`
- `https://your-project.vercel.app/api/log`
- `https://your-project.vercel.app/api/logs`
- `https://your-project.vercel.app/api/analytics`

## Important Notes

1. **MongoDB Atlas**: Ensure your MongoDB Atlas cluster allows connections from Vercel's IP ranges
2. **Cold Starts**: Serverless functions may have cold start delays
3. **Connection Pooling**: Consider using connection pooling for better performance
4. **Environment Variables**: Never commit sensitive data to your repository

## Troubleshooting

- **Connection Issues**: Check MongoDB Atlas network access settings
- **Build Failures**: Ensure all dependencies are in `package.json`
- **Runtime Errors**: Check Vercel function logs in the dashboard
