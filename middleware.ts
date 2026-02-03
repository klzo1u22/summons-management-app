import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

const PROTECTED_ROUTES = ['/', '/reports', '/profile', '/settings'];
const AUTH_ROUTES = ['/login'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const session = request.cookies.get('session')?.value;

    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
    const isAuthRoute = AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));

    if (isProtectedRoute && !session) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (session) {
        try {
            const payload = await decrypt(session);
            const user = payload.user;

            // Restrict /admin routes to admins only
            if (pathname.startsWith('/admin') && user.role !== 'admin') {
                return NextResponse.redirect(new URL('/', request.url));
            }

            if (isAuthRoute) {
                return NextResponse.redirect(new URL('/', request.url));
            }
        } catch (e) {
            // Invalid session, allow access to login
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
