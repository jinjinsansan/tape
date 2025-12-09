import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  console.log('[Auth Confirm] URL:', request.url)
  console.log('[Auth Confirm] token_hash:', token_hash)
  console.log('[Auth Confirm] type:', type)
  console.log('[Auth Confirm] All params:', Object.fromEntries(searchParams.entries()))

  if (token_hash && type) {
    const response = NextResponse.redirect(new URL(next, request.url))

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => 
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({
      type: type as 'email',
      token_hash,
    })

    console.log('[Auth Confirm] verifyOtp error:', error)

    if (!error) {
      console.log('[Auth Confirm] Success, redirecting to:', next)
      return response
    }
    
    console.error('[Auth Confirm] verifyOtp failed:', error.message)
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error.message)}`, request.url))
  }

  // パラメータ不足の場合
  console.error('[Auth Confirm] Missing parameters')
  return NextResponse.redirect(new URL('/?error=認証パラメータが不足しています', request.url))
}
