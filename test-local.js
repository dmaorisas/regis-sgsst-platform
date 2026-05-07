const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Logging in as admin@regis.test...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@regis.test',
    password: 'Demo2026!'
  });

  if (error) {
    console.error('Login failed:', error.message);
    return;
  }

  const session = data.session;
  console.log('Login success! Fetching /regis/dashboard from LOCALHOST...');

  const response = await fetch('http://localhost:3000/regis/dashboard', {
    headers: {
      'Cookie': `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token=${JSON.stringify(session)}`
    }
  });

  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response excerpt:', text.substring(0, 1500));
}

test();
