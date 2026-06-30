import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import promptRoutes from './routes/prompts.js';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/prompts', promptRoutes);

// Serve static files from the React build in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Catch-all route to serve index.html for client-side routing
// Using app.use to avoid Express 5 wildcard issues
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Database connection and server start
setupDatabase().then(() => {
  console.log('SQLite database initialized');
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database', err);
  process.exit(1);
});
