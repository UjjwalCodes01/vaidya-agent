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

// Import the validation function - this will run the validation
require('../lib/env.ts').validateEnv();

console.log('✅ Environment validation passed');