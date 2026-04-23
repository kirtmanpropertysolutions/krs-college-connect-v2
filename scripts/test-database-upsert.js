#!/usr/bin/env node

/**
 * Test database upsert logic directly without depending on web scraping
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
let env = {};
try {
  const envContent = readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (error) {
  console.error('Error reading .env.local:', error);
  process.exit(1);
}

// Initialize Supabase client with service role
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false }
  }
);

console.log('🔧 Testing database upsert logic directly...\n');

async function testDatabaseUpsert() {
  try {
    // Get Stanford school data
    console.log('🔍 Getting Stanford school data...');
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, email_domain')
      .eq('name', 'Stanford University')
      .single();

    if (schoolError) {
      console.error('❌ School lookup error:', schoolError);
      return false;
    }

    console.log('✅ Found school:', school);

    // Check current coaches
    console.log('\n🔍 Current coaches before test...');
    const { data: beforeCoaches, error: beforeError } = await supabase
      .from('coaches')
      .select('*')
      .eq('school_id', school.id);

    if (beforeError) {
      console.error('❌ Error fetching coaches:', beforeError);
      return false;
    }

    console.log(`📊 Found ${beforeCoaches.length} existing coaches:`);
    beforeCoaches.forEach(coach => {
      console.log(`   • ${coach.name} - ${coach.email || 'no email'} - verified: ${coach.verified_at ? 'YES' : 'NO'}`);
    });

    // Test upsert with a new test coach
    console.log('\n📝 Testing upsert with test coach...');
    const testCoach = {
      school_id: school.id,
      name: 'Test Coach Scraped',
      title: 'Test Coach',
      email: 'test.coach@stanford.edu',
      verified_at: new Date().toISOString(),
      created_by: null,
      org_id: null,
      visibility: 'shared'
    };

    console.log('   Coach record to upsert:', testCoach);

    const { data: upsertData, error: upsertError } = await supabase
      .from('coaches')
      .upsert(testCoach, {
        onConflict: 'school_id,name',
        ignoreDuplicates: false
      })
      .select();

    if (upsertError) {
      console.error('   ❌ Upsert error:', upsertError);
      return false;
    }

    console.log('   ✅ Upsert successful! Returned data:', upsertData);

    // Verify the coach was added
    console.log('\n🔍 Verifying coach was added...');
    const { data: afterCoaches, error: afterError } = await supabase
      .from('coaches')
      .select('*')
      .eq('school_id', school.id);

    if (afterError) {
      console.error('❌ Error fetching updated coaches:', afterError);
      return false;
    }

    console.log(`📊 Found ${afterCoaches.length} coaches after upsert:`);
    afterCoaches.forEach(coach => {
      console.log(`   • ${coach.name} - ${coach.email || 'no email'} - verified: ${coach.verified_at ? 'YES' : 'NO'}`);
    });

    // Test updating existing coach
    console.log('\n📝 Testing update of existing coach...');
    const updateCoach = {
      school_id: school.id,
      name: 'Test Coach Scraped', // Same name to trigger update
      title: 'Updated Test Coach',
      email: 'updated.test.coach@stanford.edu',
      verified_at: new Date().toISOString(),
      created_by: null,
      org_id: null,
      visibility: 'shared'
    };

    const { data: updateData, error: updateError } = await supabase
      .from('coaches')
      .upsert(updateCoach, {
        onConflict: 'school_id,name',
        ignoreDuplicates: false
      })
      .select();

    if (updateError) {
      console.error('   ❌ Update error:', updateError);
      return false;
    }

    console.log('   ✅ Update successful! Returned data:', updateData);

    // Final verification
    console.log('\n🔍 Final verification...');
    const { data: finalCoaches } = await supabase
      .from('coaches')
      .select('*')
      .eq('school_id', school.id);

    console.log(`📊 Final coach count: ${finalCoaches.length}`);
    const testCoachFinal = finalCoaches.find(c => c.name === 'Test Coach Scraped');
    if (testCoachFinal) {
      console.log('✅ Test coach found with updated data:', testCoachFinal);
    }

    // Clean up - remove test coach
    console.log('\n🧹 Cleaning up test coach...');
    await supabase
      .from('coaches')
      .delete()
      .eq('school_id', school.id)
      .eq('name', 'Test Coach Scraped');

    console.log('✅ Test coach removed');

    return true;

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 DATABASE UPSERT TEST');
  console.log('='.repeat(60));

  const success = await testDatabaseUpsert();

  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ DATABASE UPSERT TEST PASSED');
    console.log('The upsert logic is working correctly!');
  } else {
    console.log('❌ DATABASE UPSERT TEST FAILED');
    console.log('There are issues with the upsert logic.');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);