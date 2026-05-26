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

        console.log("[AUTH DEBUG] authorize called with input:", input);

        try {
          // Robust, multi-vector authentication lookup:
          // Check by email, or username, or internId (all case-insensitive)
          const user = await db.user.findFirst({
            where: {
              deletedAt: null,
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

          console.log("[AUTH DEBUG] User query returned:", user ? { email: user.email, role: user.role, status: user.status, deletedAt: user.deletedAt } : "null");

          if (user) {
            if (user.status === "PENDING") {
              console.log("[AUTH DEBUG] User status is PENDING. Rejecting login.");
              throw new Error("Your account registration is pending review by the administration.");
            }
            if (user.status === "REJECTED") {
              console.log("[AUTH DEBUG] User status is REJECTED. Rejecting login.");
              throw new Error("Your account registration has been rejected.");
            }
            if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
              console.log("[AUTH DEBUG] User account is locked until:", user.lockedUntil);
              throw new Error("Account is temporarily locked due to too many failed login attempts. Please try again in 15 minutes.");
            }

            const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
            console.log("[AUTH DEBUG] Password check result:", isPasswordValid);
            if (isPasswordValid) {
              await db.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedUntil: null }
              });
              return {
                id: user.id,
                email: user.email,
                name: user.fullName,
                role: user.role,
                changePasswordRequired: user.changePasswordRequired,
                tokenVersion: user.tokenVersion,
              };
            } else {
              const attempts = user.failedLoginAttempts + 1;
              const lockedUntil = attempts >= 10 ? new Date(Date.now() + 15 * 60 * 1000) : null;
              await db.user.update({
                where: { id: user.id },
                data: {
                  failedLoginAttempts: attempts,
                  lockedUntil: lockedUntil
                }
              });
              if (attempts >= 10) {
                throw new Error("Account is temporarily locked due to too many failed login attempts. Please try again in 15 minutes.");
              }
            }
          }
        } catch (dbError: any) {
          // Re-throw account status or lockout errors so NextAuth can surface them
          if (
            dbError?.message?.includes("pending") ||
            dbError?.message?.includes("rejected") ||
            dbError?.message?.includes("locked")
          ) {
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
        token.tokenVersion = (user as any).tokenVersion;
      } else if (token.id) {
        // Skip DB lookups in the Edge runtime (middleware) to prevent Prisma errors
        if (process.env.NEXT_RUNTIME !== "edge") {
          try {
            const freshUser = await db.user.findUnique({
              where: { id: token.id as string },
              select: { role: true, changePasswordRequired: true, tokenVersion: true },
            });
            if (freshUser) {
              if (token.tokenVersion !== freshUser.tokenVersion) {
                return {} as any;
              }
              token.role = freshUser.role;
              token.changePasswordRequired = freshUser.changePasswordRequired;
              token.tokenVersion = freshUser.tokenVersion;
            } else {
              return {} as any;
            }
          } catch (err) {
            console.warn("[AUTH JWT] Database lookup failed:", err);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (!token || !token.id) {
        return null as any;
      }
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).changePasswordRequired = token.changePasswordRequired;
        (session.user as any).tokenVersion = token.tokenVersion;
      }
      return session;
    },
  },
});
