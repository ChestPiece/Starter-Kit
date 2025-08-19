import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    // Prepare a response object that will be mutated by Supabase cookie setter
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Ensure cookies are attached to the final response
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    if (code) {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Email confirmation failed:', error)
        const redirectResponse = NextResponse.redirect(`${origin}/auth/login?message=confirmation_failed`)
        supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
          redirectResponse.cookies.set(name, value, options)
        })
        return redirectResponse
      }

      // Success - redirect to confirmation success page with proper session cookies
      console.log('✅ Email confirmed successfully for:', data?.user?.email)
      const redirectResponse = NextResponse.redirect(`${origin}/auth/confirm?confirmed=true`)
      supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
        redirectResponse.cookies.set(name, value, options)
      })
      return redirectResponse
    }

    // Handle token-based confirmation (fallback)
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      })

      if (error) {
        console.error('Token verification failed:', error)
        const redirectResponse = NextResponse.redirect(`${origin}/auth/login?message=invalid_confirmation_link`)
        supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
          redirectResponse.cookies.set(name, value, options)
        })
        return redirectResponse
      }

      // Success - redirect to confirmation success page
      console.log('✅ Token verified successfully')
      const redirectResponse = NextResponse.redirect(`${origin}/auth/confirm?confirmed=true`)
      supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
        redirectResponse.cookies.set(name, value, options)
      })
      return redirectResponse
    }

    // No valid confirmation parameters
    return NextResponse.redirect(`${origin}/auth/login?message=invalid_link`)

  } catch (error: any) {
    console.error('Confirmation error:', error)
    const { origin } = new URL(request.url)
    return NextResponse.redirect(`${origin}/auth/login?message=confirmation_failed`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      access_token?: string
      refresh_token?: string
    }

    const { access_token, refresh_token } = body
    if (!access_token || !refresh_token) {
      return NextResponse.json({ ok: false, error: 'missing_tokens' }, { status: 400 })
    }

    let supabaseResponse = NextResponse.json({ ok: true })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            supabaseResponse = NextResponse.json({ ok: true })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) {
      console.error('Failed to persist session:', error)
      return NextResponse.json({ ok: false, error: 'persist_failed' }, { status: 400 })
    }

    return supabaseResponse
  } catch (error) {
    console.error('POST /api/auth/confirm error:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
