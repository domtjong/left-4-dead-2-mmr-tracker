import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { session } } = await supabase.auth.getSession();
  const url = request.nextUrl.clone();

  const protectedPaths = [
    '/dashboard',
    '/charts',
    '/gangs',
    '/input',
    '/player-stats'
  ];

  if (session) {
    if (url.pathname === '/') {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  } else {
    if (protectedPaths.some(path => url.pathname.startsWith(path))) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
    '/dashboard',
    '/charts',
    '/gangs',
    '/input',
    '/player-stats'
  ],
};
