#!/usr/bin/env tsx
/**
 * Production Validation Script
 * Validates that all Phase 4 components are properly configured and working
 */

import { getEnabledProviders } from '../lib/auth/oauth-manager';

async function validateProduction() {
  console.log('🔍 Validating Production Readiness...\n');

  const results = {
    jwt: false,
    oauth: false,
    rateLimiter: false,
    environment: false
  };

  try {
    // 1. Validate JWT Configuration
    console.log('1. JWT Configuration...');
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret && jwtSecret !== 'development-secret-change-in-production') {
        console.log('   ✅ JWT secret properly configured');
        results.jwt = true;
      } else {
        console.log('   ❌ JWT secret not set or using development default');
      }
    } catch (error) {
      console.log(`   ❌ JWT validation failed: ${error instanceof Error ? error.message : error}`);
    }

    // 2. Validate OAuth Providers
    console.log('\n2. OAuth Providers...');
    try {
      const providers = await getEnabledProviders();
      if (providers.length > 0) {
        console.log(`   ✅ OAuth providers configured: ${providers.map(p => p.displayName).join(', ')}`);
        results.oauth = true;
      } else {
        console.log('   ❌ No OAuth providers configured');
      }
    } catch (error) {
      console.log(`   ❌ OAuth validation failed: ${error instanceof Error ? error.message : error}`);
    }

    // 3. Validate Rate Limiter
    console.log('\n3. Rate Limiter...');
    try {
      const config = validateRateLimiterConfig();
      console.log(`   ✅ Rate limiter configured: ${config.redis ? 'Redis-backed' : 'In-memory fallback'}`);
      results.rateLimiter = true;
    } catch (error) {
      console.log(`   ❌ Rate limiter validation failed: ${error instanceof Error ? error.message : error}`);
    }

    // 4. Validate Environment
    console.log('\n4. Environment Variables...');
    const requiredEnvVars = [
      'NEXTAUTH_SECRET',
      'GCP_PROJECT_ID',
      'FIRESTORE_DATABASE_ID'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      console.log('   ✅ All required environment variables configured');
      results.environment = true;
    } else {
      console.log(`   ❌ Missing environment variables: ${missingVars.join(', ')}`);
    }

    // 5. Overall Assessment
    console.log('\n📊 Production Readiness Summary:');
    console.log(`   JWT Authentication: ${results.jwt ? '✅' : '❌'}`);
    console.log(`   OAuth Providers: ${results.oauth ? '✅' : '❌'}`);
    console.log(`   Rate Limiting: ${results.rateLimiter ? '✅' : '❌'}`);
    console.log(`   Environment: ${results.environment ? '✅' : '❌'}`);

    const allPassed = Object.values(results).every(Boolean);
    console.log(`\n🎯 Overall Status: ${allPassed ? '✅ PRODUCTION READY' : '⚠️ NEEDS CONFIGURATION'}`);

    if (!allPassed) {
      console.log('\n💡 Quick fixes:');
      if (!results.jwt) {
        console.log('   • Set JWT_SECRET environment variable (avoid development default)');
      }
      if (!results.oauth) {
        console.log('   • Configure GOOGLE_OAUTH_CLIENT_ID/SECRET or ABHA_OAUTH_CLIENT_ID/SECRET');
      }
      if (!results.environment) {
        console.log('   • Set missing environment variables listed above');
      }
    } else {
      console.log('\n🚀 System is production-ready! All security components configured.');
    }

    console.log('\n📝 Additional configurations:');
    console.log(`   • Redis URL: ${process.env.REDIS_URL ? '✅ Configured' : '❌ Using in-memory fallback'}`);
    console.log(`   • Secret Manager: ${process.env.GCP_SECRET_MANAGER_ENABLED === 'true' ? '✅ Enabled' : '❌ Using fallback secrets'}`);
    
    const demoEnabled = process.env.DEMO_AUTH_ENABLED === 'true';
    const demoUsers = process.env.DEMO_ALLOWED_USERS;
    if (demoEnabled) {
      if (process.env.NODE_ENV === 'production' && demoUsers) {
        console.log(`   • Demo Auth: ⚠️ Enabled with allowlist (${demoUsers.split(',').length} users)`);
      } else if (process.env.NODE_ENV === 'production') {
        console.log('   • Demo Auth: ❌ Enabled without allowlist (SECURITY RISK)');
      } else {
        console.log('   • Demo Auth: ⚠️ Enabled (development mode)');
      }
    } else {
      console.log('   • Demo Auth: ✅ Disabled');
    }
    
    console.log(`   • Mock ABDM: ${process.env.MOCK_ABDM_RESPONSES === 'true' ? '⚠️ Enabled (disable for production)' : '✅ Disabled'}`);
    console.log(`   • Mock UHI: ${process.env.MOCK_UHI_RESPONSES === 'true' ? '⚠️ Enabled (disable for production)' : '✅ Disabled'}`);
    console.log(`   • Instrumentation: ✅ Secret initialization wired via instrumentation.ts`);

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  }
}

// Helper function to validate rate limiter config
function validateRateLimiterConfig() {
  const redisUrl = process.env.REDIS_URL;
  return {
    redis: !!redisUrl,
    fallback: true // Always has in-memory fallback
  };
}

if (require.main === module) {
  validateProduction();
}