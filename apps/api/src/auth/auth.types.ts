export interface AuthUser {
  userId: string;
  clerkId: string;
  email: string;
}

export interface GqlContext {
  user: AuthUser | null;
  ip: string | null;
}
