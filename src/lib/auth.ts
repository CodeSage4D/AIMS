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
    maxAge: 8 * 60 * 60, // 8 Hours Session Expiry
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
          // Robust, multi-vector authentication lookup:
          // Check by email, or username, or internId (all case-insensitive)
          const user = await db.user.findFirst({
            where: {
              OR: [
                { email: { equals: input, mode: "insensitive" } },
                { username: { equals: input, mode: "insensitive" } },
                {
                  internProfile: {
                    internId: { equals: input, mode: "insensitive" }
                  }
                }
              ]
            }
          });

          if (user) {
            if (user.status === "PENDING") {
              throw new Error("Your account registration is pending review by the administration.");
            }
            if (user.status === "REJECTED") {
              throw new Error("Your account registration has been rejected.");
            }
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
        } catch (dbError: any) {
          // Re-throw account status errors so NextAuth can surface them
          if (dbError?.message?.includes("pending") || dbError?.message?.includes("rejected")) {
            throw dbError;
          }
          console.warn(
            "Database connection failed during login:",
            dbError
          );
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
      } else if (token.id) {
        // Skip DB lookups in the Edge runtime (middleware) to prevent Prisma errors
        if (process.env.NEXT_RUNTIME !== "edge") {
          try {
            const freshUser = await db.user.findUnique({
              where: { id: token.id as string },
              select: { role: true, changePasswordRequired: true },
            });
            if (freshUser) {
              token.role = freshUser.role;
              token.changePasswordRequired = freshUser.changePasswordRequired;
            }
          } catch (err) {
            console.warn("[AUTH JWT] Database lookup failed:", err);
          }
        }
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
