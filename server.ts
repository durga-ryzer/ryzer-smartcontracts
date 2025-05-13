import express, { Express, Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '5000', 10);

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Serve the backend API
app.use('/api', require('./backend/dist/index'));

// For any other request, serve the React app
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Mode: Production');
});