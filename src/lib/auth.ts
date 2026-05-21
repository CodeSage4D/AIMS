import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { auth, handlers, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 Hours Session Expiry
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        try {
          const user = await db.user.findUnique({
            where: { email },
          });

          if (user) {
            const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
            if (isPasswordValid) {
              return {
                id: user.id,
                email: user.email,
                name: user.fullName,
                role: user.role,
              };
            }
          }
        } catch (dbError) {
          console.warn(
            "Database connection failed during login:",
            dbError
          );
        }

        // DEV-ONLY Fallback (Requested by User for local testing during DB outage)
        if (process.env.NODE_ENV !== "production") {
          if (email === "aurxon" && password === "AurxonFuture#136") {
            return {
              id: "dev-aurxon-admin",
              email: "aurxon@aurxon.demo",
              name: "Aurxon Admin (Dev Override)",
              role: "ADMIN",
            };
          }
          if (email === "admin@aurxon.demo" && password === "aims-demo-admin-2026") {
            return {
              id: "demo-admin-user",
              email: "admin@aurxon.demo",
              name: "AIMS Demo Administrator (Dev Override)",
              role: "ADMIN",
            };
          }
          if (email === "mentor@aurxon.demo" && password === "aims-demo-mentor-2026") {
            return {
              id: "demo-mentor-user",
              email: "mentor@aurxon.demo",
              name: "AIMS Demo Mentor (Dev Override)",
              role: "MENTOR",
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
});
