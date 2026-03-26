/**
 * Next.js Instrumentation
 * Called once at server startup to initialize secrets and auth
 * 
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server-side (not edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Initializing application...');
    
    const isProduction = process.env.NODE_ENV === 'production';
    let criticalError = false;
    
    try {
      // Initialize secrets and JWT
      const { initializeSecrets } = await import('./lib/security/secrets-manager');
      await initializeSecrets();
      console.log('[Instrumentation] ✅ Secrets and JWT initialized');
    } catch (error) {
      console.error('[Instrumentation] ❌ CRITICAL: Failed to initialize secrets:', error);
      criticalError = true;
      
      // Fail fast in production - cannot run without secrets
      if (isProduction) {
        console.error('[Instrumentation] 🛑 Cannot continue without secrets in production');
        console.error('[Instrumentation] 🛑 Terminating application...');
        process.exit(1);
      }
      
      console.warn('[Instrumentation] ⚠️  Development mode: Continuing despite initialization failure');
    }
    
    // Validate configuration (non-fatal but warn)
    const demoAuthEnabled = process.env.DEMO_AUTH_ENABLED === 'true';
    const secretManagerEnabled = process.env.GCP_SECRET_MANAGER_ENABLED === 'true';
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
    
    console.log('[Instrumentation] Configuration:', {
      environment: process.env.NODE_ENV,
      demoAuth: demoAuthEnabled,
      secretManager: secretManagerEnabled,
      redisConfigured: !!redisUrl,
      mockABDM: process.env.MOCK_ABDM_RESPONSES === 'true',
      mockUHI: process.env.MOCK_UHI_RESPONSES === 'true',
    });
    
    // Production-specific warnings
    if (isProduction) {
      let hasWarnings = false;
      
      if (demoAuthEnabled) {
        console.error('[Instrumentation] ⚠️  WARNING: Demo auth is enabled in production!');
        console.error('[Instrumentation] ⚠️  This should only be used for testing/demos.');
        console.error('[Instrumentation] ⚠️  Set DEMO_AUTH_ENABLED=false for production.');
        hasWarnings = true;
      }
      
      if (!secretManagerEnabled) {
        console.error('[Instrumentation] ⚠️  WARNING: Secret Manager is disabled in production!');
        console.error('[Instrumentation] ⚠️  Secrets will be loaded from environment variables.');
        console.error('[Instrumentation] ⚠️  Set GCP_SECRET_MANAGER_ENABLED=true for production.');
        hasWarnings = true;
      }
      
      if (!redisUrl) {
        console.error('[Instrumentation] ⚠️  CRITICAL: Redis is not configured in production!');
        console.error('[Instrumentation] ⚠️  Rate limiting will use in-memory storage (NOT distributed).');
        console.error('[Instrumentation] ⚠️  This means rate limits will NOT work correctly across multiple instances.');
        console.error('[Instrumentation] ⚠️  Set REDIS_URL or UPSTASH_REDIS_REST_URL environment variable.');
        hasWarnings = true;
      }
      
      if (hasWarnings) {
        console.error('[Instrumentation] ⚠️  Production configuration issues detected - review above warnings');
      }
    }
    
    // Final status
    if (!criticalError) {
      console.log('[Instrumentation] ✅ Application ready');
    } else {
      console.warn('[Instrumentation] ⚠️  Application started with errors (development mode only)');
    }
  }
}
