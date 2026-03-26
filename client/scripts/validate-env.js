#!/usr/bin/env node

/**
 * Environment Validation Script
 * Run this before starting the application to validate all environment variables
 *
 * Usage: node scripts/validate-env.js
 */

// Import the validation function - this will run the validation
require('../lib/env.ts').validateEnv();

console.log('✅ Environment validation passed');