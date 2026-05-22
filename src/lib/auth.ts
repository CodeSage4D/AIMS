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

        const input = String(credentials.email).trim();
        const password = String(credentials.password);

        try {
          let user = null;
          
          if (input.includes("@")) {
            // Unambiguous Email Address Lookup
            user = await db.user.findUnique({
              where: { email: input.toLowerCase() },
            });
          } else if (input.toLowerCase().startsWith("axn-")) {
            // Unambiguous Intern ID Lookup
            const intern = await db.intern.findUnique({
              where: { internId: input.toUpperCase() },
              include: { user: true },
            });
            user = intern?.user || null;
          } else {
            // Unambiguous Username Lookup
            user = await db.user.findFirst({
              where: {
                OR: [
                  { username: input },
                  { username: input.toLowerCase() },
                  { username: input.toUpperCase() },
                ],
              },
            });
          }

          if (user) {
            const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
            if (isPasswordValid) {
              return {
                id: user.id,
                email: user.email,
                name: user.fullName,
                role: user.role,
                changePasswordRequired: user.changePasswordRequired,
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
          const inputLower = input.toLowerCase();
          if (inputLower === "founder@aurxon.demo" && password === "aims-demo-founder-2026") {
            return {
              id: "dev-founder",
              email: "founder@aurxon.demo",
              name: "Aurxon Founder (Elite)",
              role: "FOUNDER",
              changePasswordRequired: false,
            };
          }
          if (inputLower === "hr@aurxon.demo" && password === "aims-demo-hr-2026") {
            return {
              id: "dev-hr",
              email: "hr@aurxon.demo",
              name: "Aurxon HR Manager",
              role: "HR",
              changePasswordRequired: false,
            };
          }
          if (inputLower === "lead@aurxon.demo" && password === "aims-demo-lead-2026") {
            return {
              id: "dev-lead",
              email: "lead@aurxon.demo",
              name: "Aurxon Team Lead",
              role: "TEAM_LEAD",
              changePasswordRequired: false,
            };
          }
          if ((inputLower === "aarav@aurxon.demo" || input === "AXN-SWE-2605-AS01" || inputLower === "axn-swe-2605-as01") && password === "aims-demo-intern-2026") {
            return {
              id: "dev-intern",
              email: "aarav@aurxon.demo",
              name: "Aarav Sharma",
              role: "INTERN",
              changePasswordRequired: true,
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
        token.changePasswordRequired = (user as any).changePasswordRequired;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).changePasswordRequired = token.changePasswordRequired;
      }
      return session;
    },
  },
});
