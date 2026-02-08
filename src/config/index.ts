/**
 * Application Configuration
 * Centralized config management for development and production
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Get current directory (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  // Data paths
  dataDir: process.env.DATA_DIR || path.join(__dirname, '../../data'),
  catalogFile: process.env.CATALOG_FILE || path.join(__dirname, '../../data/battery-catalog.csv'),
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // File Storage
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // 'local', 's3', 'r2'
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      bucket: process.env.AWS_S3_BUCKET || '',
      region: process.env.AWS_REGION || 'us-east-1',
    },
    r2: {
      accountId: process.env.R2_ACCOUNT_ID || '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      bucketName: process.env.R2_BUCKET_NAME || '',
    },
  },
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
 
  // HVAC compute service (Python / FastAPI)
  hvacComputeUrl: process.env.HVAC_COMPUTE_URL || 'http://localhost:8010',
  
  // Feature flags
  features: {
    useDatabase: process.env.USE_DATABASE === 'true',
    useFileStorage: process.env.USE_FILE_STORAGE === 'true',
  },
};

// Ensure data directory exists
export function getCatalogPath(): string {
  // Check if environment variable is set
  if (process.env.CATALOG_FILE) {
    return process.env.CATALOG_FILE;
  }
  
  // Try multiple possible locations
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'battery-catalog.csv'),
    path.join(process.cwd(), 'public', 'battery-catalog.csv'),
    path.join(__dirname, '../../data/battery-catalog.csv'),
    path.join(__dirname, '../../public/battery-catalog.csv'),
  ];
  
  // Return the first path that exists, or default to data directory
  for (const possiblePath of possiblePaths) {
    if (existsSync(possiblePath)) {
      return possiblePath;
    }
  }
  
  // Default fallback
  return path.join(process.cwd(), 'data', 'battery-catalog.csv');
}

export function getDataDirectory(): string {
  return config.dataDir;
}

