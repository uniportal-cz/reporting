import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/auth/login',
  },
  providers: [],
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      if (pathname.startsWith('/api/auth')) return true
      if (pathname.startsWith('/auth')) {
        if (isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl))
        return true
      }
      if (!isLoggedIn) return false
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? 'member'
        token.id = user.id ?? ''
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        (session.user as { role?: string }).role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
