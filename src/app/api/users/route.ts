import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Authorization check to ensure caller is Admin
async function ensureAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {} // We only read cookies for auth here
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    throw new Error("Unauthorized")
  }
}

export async function GET() {
  try {
    await ensureAdmin();
    const adminClient = createAdminClient();
    
    // Fetch all users
    const { data, error } = await adminClient.auth.admin.listUsers()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Format output
    const users = data.users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.app_metadata?.role || 'client',
      displayName: u.user_metadata?.displayName || '',
      created_at: u.created_at
    }))

    return NextResponse.json({ users })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureAdmin();
    const { email, password, role, displayName } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const adminClient = createAdminClient();
    
    const { data: newUser, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { displayName },
      app_metadata: { role: role || 'client' }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ user: newUser })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
}
