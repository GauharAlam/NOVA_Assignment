import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getProjectPermissions } from "@/lib/rbac";
import { ProjectAnalyticsView } from "@/components/analytics/ProjectAnalyticsView";

export default async function ProjectAnalyticsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const { id: projectId } = params;
  const permissions = await getProjectPermissions(projectId, session.id);
  if (!permissions.canView) notFound();

  return <ProjectAnalyticsView projectId={projectId} />;
}
