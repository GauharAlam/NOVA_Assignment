import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getProjectPermissions } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = params;
    const permissions = await getProjectPermissions(projectId, session.id);
    if (!permissions.canView) {
      return NextResponse.json({ error: "Forbidden or not found" }, { status: 404 });
    }

    const activityLogs = await prisma.activityLog.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        task: { select: { id: true, taskNumber: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ activities: activityLogs });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
  }
}
