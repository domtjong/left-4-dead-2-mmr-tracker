import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Update session using your existing function
  const response = await updateSession(request);

  // Create a Supabase client to fetch the session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  console.log(`Session: ${session}`);
  console.log(`Pathname: ${pathname}`);

  // if (session) {
  //   // User is authenticated
  //   if (pathname === '/') {
  //     console.log('Redirecting to /dashboard');
  //     return NextResponse.redirect(new URL('/dashboard', request.url));
  //   }
  // } else {
  //   // User is not authenticated
  //   if (pathname.startsWith('/dashboard')) {
  //     console.log('Redirecting to /');
  //     return NextResponse.redirect(new URL('/', request.url));
  //   }
  // }

  return response;
}

// Configure middleware matcher
export const config = {
  matcher: ['/dashboard', '/'],
};
