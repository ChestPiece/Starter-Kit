#!/usr/bin/env tsx

import { SignJWT, jwtVerify } from 'jose';

/**
 * Script to verify CSRF configuration
 */
async function verifyCsrfConfig() {
  console.log('🔒 Verifying CSRF Configuration...');
  
  try {
    // Check if CSRF_SECRET is set
    const csrfSecret = process.env.CSRF_SECRET;
    
    if (!csrfSecret) {
      console.error('❌ CSRF_SECRET environment variable is not set');
      return false;
    }
    
    if (csrfSecret === 'your-csrf-secret-key-change-this') {
      console.error('❌ CSRF_SECRET is using the default value - please change it!');
      return false;
    }
    
    if (csrfSecret.length < 32) {
      console.warn('⚠️  CSRF_SECRET should be at least 32 characters long');
    }
    
    console.log('✅ CSRF_SECRET is properly configured');
    console.log(`   Length: ${csrfSecret.length} characters`);
    
    // Test token generation and verification
    try {
      const encoder = new TextEncoder();
      const secretKey = encoder.encode(csrfSecret);
      
      const payload = {
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        type: 'csrf',
        nonce: Math.random().toString(36).substring(2, 15)
      };
      
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secretKey);
        
      console.log('✅ CSRF token generation successful');
      
      const { payload: verifiedPayload } = await jwtVerify(token, secretKey);
      
      if (verifiedPayload.type === 'csrf') {
        console.log('✅ CSRF token verification successful');
      } else {
        console.error('❌ CSRF token verification failed - invalid type');
        return false;
      }
    } catch (error) {
      console.error('❌ CSRF token operations failed:', error);
      return false;
    }
    
    console.log('🎉 CSRF configuration is working correctly!');
    return true;
    
  } catch (error) {
    console.error('❌ Error verifying CSRF configuration:', error);
    return false;
  }
}

if (require.main === module) {
  verifyCsrfConfig()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logger.error('Script failed:', { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    });
}

export { verifyCsrfConfig };