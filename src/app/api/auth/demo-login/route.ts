import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, TOKEN_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // P0 SECURITY: Block demo login in production environments
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Demo login is disabled in production. Please use standard login." },
        { status: 403 }
      );
    }

    const { role = "admin" } = await req.json();

    const roleMap: Record<string, { email: string; name: string; sysRole: string }> = {
      admin: { email: "admin@nova.dev", name: "Alex Rivers (Admin)", sysRole: "SYSTEM_ADMIN" },
      developer: { email: "dev@nova.dev", name: "Sarah Chen (Developer)", sysRole: "MEMBER" },
      viewer: { email: "viewer@nova.dev", name: "Marcus Vance (Viewer)", sysRole: "MEMBER" },
    };

    const target = roleMap[role.toLowerCase()] || roleMap.admin;

    // Find or auto-provision demo user
    let user = await prisma.user.findUnique({
      where: { email: target.email },
    });

    if (!user) {
      const passwordHash = await hashPassword("password123");
      user = await prisma.user.create({
        data: {
          email: target.email,
          name: target.name,
          passwordHash,
          role: target.sysRole,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(target.name)}`,
        },
      });

      // Also create a demo workspace
      const workspace = await prisma.workspace.create({
        data: {
          name: "Acme Corp Workspace",
          slug: `acme-corp-${Date.now().toString(36)}`,
          ownerId: user.id,
        },
      });

      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "OWNER",
        },
      });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };

    const token = signToken(sessionUser);

    const response = NextResponse.json(
      { message: `Logged in as demo ${role}`, user: sessionUser },
      { status: 200 }
    );

    response.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false, // Only accessible in non-production environments
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Demo login error:", error);
    return NextResponse.json(
      { error: "Internal server error during demo login" },
      { status: 500 }
    );
  }
}
