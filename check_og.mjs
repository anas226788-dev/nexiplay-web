import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check(url) {
  try {
    console.log('\n--- Fetching URL:', url);
    const res = await fetch(url);
    const text = await res.text();
    const ogTags = text.match(/<meta[^>]*property="og:[^>]*>/gi);
    const twitterTags = text.match(/<meta[^>]*name="twitter:[^>]*>/gi);
    console.log('Status Header:', res.status);
    console.log('OG Tags:');
    if (ogTags) {
      console.log(ogTags.join('\n'));
    } else {
      console.log('NONE FOUND');
    }
    console.log('Twitter Tags:');
    if (twitterTags) {
      console.log(twitterTags.join('\n'));
    } else {
      console.log('NONE FOUND');
    }
  } catch (err) {
    console.error('Error fetching', url, err);
  }
}

async function run() {
  await check('https://nexiplay.vercel.app');
  
  const { data, error } = await supabase.from('movies').select('type, slug').limit(1);
  if (data && data.length > 0) {
    const movieUrl = `https://nexiplay.vercel.app/${data[0].type}/${data[0].slug}`;
    await check(movieUrl);
  } else {
    console.log("No movies found or error:", error);
  }
}
run();
