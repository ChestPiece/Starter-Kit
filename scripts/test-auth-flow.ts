#!/usr/bin/env tsx

/**
 * Test script to verify Supabase-only auth flow works correctly
 * Run with: npx tsx scripts/test-auth-flow.ts
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/services/logger';
import { sanitizeUrl, sanitizeApiKey, createUrlContext } from '@/lib/utils/data-sanitizer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  logger.error('❌ Missing Supabase environment variables');
  logger.info('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseAuth() {
  logger.info('🧪 Testing Supabase Auth (Email Functionality)...\n');
  
  try {
    // Test 1: Check Supabase connection
    logger.info('1️⃣ Testing Supabase connection...');
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      logger.error('❌ Supabase connection failed:', error.message);
      return;
    }
    logger.info('✅ Supabase connection successful\n');
    
    // Test 2: Test password reset email using Supabase built-in emails
    const testEmail = process.argv[2];
    if (testEmail && testEmail.includes('@')) {
      logger.info('2️⃣ Testing Supabase password reset...');
      logger.info('📧 Sending password reset email', { emailDomain: testEmail.split('@')[1] });
      logger.info('📋 Using Supabase built-in email service\n');
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
      });
      
      if (resetError) {
        if (resetError.message.includes('rate limit')) {
          logger.info('⏱️  Rate limited - this is normal, try again in a minute');
        } else if (resetError.message.includes('User not found')) {
          logger.info('🔍 User not found - but request was processed (security feature)');
        } else {
          logger.error('❌ Password reset failed:', resetError.message);
        }
      } else {
        logger.info('✅ Password reset request sent successfully!');
        logger.info('📬 Check your email or http://localhost:54324 (local development)');
        logger.info('🔗 Reset links redirect configured', createUrlContext(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`));
      }
    } else {
      logger.info('2️⃣ Skipping password reset test (no email provided)');
      logger.info('💡 Run with test email: npx tsx scripts/test-auth-flow.ts test@example.com');
    }
    
    logger.info('\n🎯 Configuration Check:');
    logger.info('   📍 Supabase URL configured', createUrlContext(supabaseUrl));
    logger.info('   🔑 API Key status', { hasApiKey: !!supabaseKey, keyLength: supabaseKey?.length || 0 });
    logger.info(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    logger.info('\n🎉 Supabase auth test completed!');
    logger.info('\n📝 Next steps:');
    logger.info('1. Make sure Supabase is running: supabase start');
    logger.info('2. Start your app: npm run dev');
    logger.info('3. Navigate to login page', createUrlContext(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login`));
    logger.info('4. Click "Forgot Password" and test the flow');
    logger.info('5. Check emails at: http://localhost:54324 (local development)');
    logger.info('6. For production, configure your Supabase project dashboard');
    
  } catch (error) {
    logger.error('❌ Test failed:', error);
  }
}

// Run the test
testSupabaseAuth();
