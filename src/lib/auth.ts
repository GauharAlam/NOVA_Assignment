import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SessionUser } from "@/types";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    // Only throw in runtime production when not in Next.js build phase
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("FATAL: JWT_SECRET environment variable is missing or too short (min 32 chars). Set JWT_SECRET in your Vercel/production environment variables.");
    }
    return "nova-dev-only-insecure-secret-do-not-use-in-production!!";
  }
  return secret;
}
export const TOKEN_COOKIE_NAME = "nova_token";

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
  iat?: number;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: SessionUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the current session user from cookies or Authorization header
 */
export async function getSessionUser(req?: NextRequest): Promise<SessionUser | null> {
  let token: string | undefined;

  if (req) {
    // 1. Check Authorization header
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    // 2. Fall back to cookie
    if (!token) {
      token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    }
  } else {
    // Server component / route handler cookie store
    const cookieStore = cookies();
    token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.avatarUrl,
    role: payload.role,
  };
}
