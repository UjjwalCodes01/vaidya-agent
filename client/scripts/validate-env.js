#!/usr/bin/env node

/**
 * Environment Validation Script
 * Run this before starting the application to validate all environment variables
 *
 * Usage: node scripts/validate-env.js
 */

// Load .env.local before validation
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local (takes precedence)
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
// Also load .env as fallback
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Required environment variables
const requiredVars = [
  'GCP_PROJECT_ID',
  'GCP_REGION',
];

// Optional but recommended
const recommendedVars = [
  'GCP_SERVICE_ACCOUNT_KEY_BASE64',
  'VERTEX_AI_MODEL',
];

let hasErrors = false;

// Check required variables
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    hasErrors = true;
  }
}

// Warn about recommended variables
for (const varName of recommendedVars) {
  if (!process.env[varName]) {
    console.warn(`⚠️  Missing recommended environment variable: ${varName}`);
  }
}

if (hasErrors) {
  console.error('\n❌ Environment validation failed. Please set the required variables.');
  process.exit(1);
}

console.log('✅ Environment validation passed');
