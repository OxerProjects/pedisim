import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSignIn() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@pedisim.app',
    password: 'SomeDummyPassword' // We don't know the real one, but we are checking if user exists or if email is not confirmed
  })
  
  console.log("SignIn Error:", JSON.stringify(error, null, 2))
  
  const adminClient = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  const { data: usersData, error: usersErr } = await adminClient.auth.admin.listUsers()
  if (usersErr) {
    console.error("Admin Users Error:", usersErr)
  } else {
    console.log("Users in DB:", usersData.users.map(u => ({ email: u.email, confirmed_at: u.email_confirmed_at, role: u.app_metadata?.role })))
  }
}

testSignIn()
