import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { connectDb } from "./db";
import { User, Staff, Guardian } from "@/models";
import { normalizeMsisdn } from "./adapters/sms";

const credsSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { identifier: {}, password: {} },
      async authorize(raw) {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { identifier, password } = parsed.data;

        await connectDb();
        const id = identifier.trim().toLowerCase();
        const phone = normalizeMsisdn(identifier.trim());
        const user = await User.findOne({
          $or: [{ email: id }, { phone }, { phone: identifier.trim() }],
          active: true,
        });
        if (!user) return null;
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          user.failedLogins = (user.failedLogins ?? 0) + 1;
          if (user.failedLogins >= 8) {
            user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
            user.failedLogins = 0;
          }
          await user.save();
          return null;
        }

        user.failedLogins = 0;
        user.lockedUntil = undefined;
        user.lastLoginAt = new Date();
        await user.save();

        let personName = user.name;
        if (user.staff) personName = (await Staff.findById(user.staff).lean())?.name ?? personName;
        else if (user.guardian)
          personName = (await Guardian.findById(user.guardian).lean())?.name ?? personName;

        return {
          id: String(user._id),
          name: String(user.name),
          email: user.email ? String(user.email) : undefined,
          roles: Array.from(user.roles).map(String),
          personName: String(personName),
          mustChangePassword: Boolean(user.mustChangePassword),
        } as unknown as import("next-auth").User;
      },
    }),
  ],
});

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
