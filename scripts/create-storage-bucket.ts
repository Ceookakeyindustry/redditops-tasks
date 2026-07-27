// Run this script: npx tsx scripts/create-storage-bucket.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function main() {
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('📦 Creating screenshot-proofs bucket...');

  // Check if bucket already exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('❌ Failed to list buckets:', listError.message);
    process.exit(1);
  }

  const existing = buckets?.find(b => b.name === 'screenshot-proofs');
  if (existing) {
    console.log('✅ Bucket already exists!');
  } else {
    const { data, error } = await supabase.storage.createBucket('screenshot-proofs', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    });

    if (error) {
      console.error('❌ Failed to create bucket:', error.message);
      process.exit(1);
    }
    console.log('✅ Bucket created successfully!');
  }

  console.log('\n📋 Bucket details:');
  console.log(`   Name: screenshot-proofs`);
  console.log(`   Public: true`);
  console.log(`   Max file size: 10MB`);
  console.log(`   Allowed types: PNG, JPEG, WebP, GIF`);
  console.log('\n✅ Setup complete!');
}

main().catch(console.error);
