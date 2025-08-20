#!/usr/bin/env tsx

/**
 * Test script to verify Supabase-only auth flow works correctly
 * Run with: npx tsx scripts/test-auth-flow.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseAuth() {
  console.log('🧪 Testing Supabase Auth (Email Functionality)...\n');
  
  try {
    // Test 1: Check Supabase connection
    console.log('1️⃣ Testing Supabase connection...');
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return;
    }
    console.log('✅ Supabase connection successful\n');
    
    // Test 2: Test password reset email using Supabase built-in emails
    const testEmail = process.argv[2];
    if (testEmail && testEmail.includes('@')) {
      console.log('2️⃣ Testing Supabase password reset...');
      console.log(`📧 Sending password reset email to: ${testEmail}`);
      console.log('📋 Using Supabase built-in email service\n');
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail, {
        redirectTo: 'http://localhost:3000/auth/reset-password',
      });
      
      if (resetError) {
        if (resetError.message.includes('rate limit')) {
          console.log('⏱️  Rate limited - this is normal, try again in a minute');
        } else if (resetError.message.includes('User not found')) {
          console.log('🔍 User not found - but request was processed (security feature)');
        } else {
          console.error('❌ Password reset failed:', resetError.message);
        }
      } else {
        console.log('✅ Password reset request sent successfully!');
        console.log('📬 Check your email or http://localhost:54324 (local development)');
        console.log('🔗 Reset links redirect to: http://localhost:3000/auth/reset-password');
      }
    } else {
      console.log('2️⃣ Skipping password reset test (no email provided)');
      console.log('💡 Run with test email: npx tsx scripts/test-auth-flow.ts test@example.com');
    }
    
    console.log('\n🎯 Configuration Check:');
    console.log(`   📍 Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
    console.log(`   🔑 Has API Key: ${supabaseKey ? 'Yes' : 'No'}`);
    console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    console.log('\n🎉 Supabase auth test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Make sure Supabase is running: supabase start');
    console.log('2. Start your app: npm run dev');
    console.log('3. Go to: http://localhost:3000/auth/login');
    console.log('4. Click "Forgot Password" and test the flow');
    console.log('5. Check emails at: http://localhost:54324 (local development)');
    console.log('6. For production, configure your Supabase project dashboard');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSupabaseAuth();
