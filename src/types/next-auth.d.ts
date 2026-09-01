import type { Role } from "@/models/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      roles: Role[];
      mustChangePassword?: boolean;
    };
  }
  interface User {
    roles?: Role[];
    personName?: string;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    roles?: Role[];
    personName?: string;
    mustChangePassword?: boolean;
  }
}
