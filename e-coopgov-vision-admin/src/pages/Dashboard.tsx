import { StatCard } from "@/components/StatCard";
import { FileText, Printer, CheckCircle2, Clock, TrendingUp, Loader2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getTemplates, getRenderJobs, Template } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

function statusBadge(status: string) {
  switch (status) {
    case "done":
      return <Badge className="bg-success/15 text-success border-0 text-xs">Hoàn thành</Badge>;
    case "pending":
      return <Badge className="bg-warning/15 text-warning border-0 text-xs">Đang xử lý</Badge>;
    case "processing":
      return <Badge className="bg-blue-500/15 text-blue-600 border-0 text-xs">Đang render</Badge>;
    case "failed":
    case "error":
      return <Badge className="bg-destructive/15 text-destructive border-0 text-xs">Lỗi</Badge>;
    default:
      return null;
  }
}

function templateFieldCount(t: Template) {
  return t.metadata?.fields?.length ?? 0;
}

function templateTableCount(t: Template) {
  return t.metadata?.tables?.length ?? 0;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { data: templates, isLoading: templatesLoading, isError: templatesError } = useQuery({
    queryKey: ["templates"],
    queryFn: getTemplates,
  });
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["render-jobs"],
    queryFn: () => getRenderJobs(200),
    refetchInterval: 15_000,
  });

  const templateCount = templates?.length ?? 0;
  const recentTemplates = templates?.slice(0, 5) ?? [];

  const totalJobs = jobs.length;
  const doneJobs = jobs.filter(j => j.status === "done").length;
  const activeJobs = jobs.filter(j => j.status === "pending" || j.status === "processing").length;
  const successRate = totalJobs > 0 ? Math.round((doneJobs / totalJobs) * 100) : 0;
  const recentJobs = jobs.slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Xin chào, {user?.full_name ?? user?.username ?? "Admin"} — Tổng quan hệ thống DocGen
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Templates"
          value={templatesLoading ? "…" : templateCount}
          subtitle="Tổng số template"
          icon={FileText}
        />
        <StatCard
          title="Documents sinh"
          value={jobsLoading ? "…" : totalJobs}
          subtitle="Tổng render jobs"
          icon={Printer}
        />
        <StatCard
          title="Thành công"
          value={jobsLoading ? "…" : `${successRate}%`}
          subtitle={jobsLoading ? "…" : `${doneJobs} / ${totalJobs} jobs`}
          icon={CheckCircle2}
        />
        <StatCard
          title="Đang xử lý"
          value={jobsLoading ? "…" : activeJobs}
          subtitle="Jobs trong queue"
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs gần đây */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border animate-fade-in">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-display font-semibold">Jobs gần đây</h2>
            <a href="/jobs" className="text-sm text-primary hover:underline">Xem tất cả →</a>
          </div>
          {jobsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Chưa có dữ liệu job
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Template</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Trạng thái</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Format</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentJobs.map(job => (
                    <tr key={job.job_id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 truncate max-w-[180px]">
                        {job.template_name ?? job.template_id}
                      </td>
                      <td className="px-4 py-2.5">{statusBadge(job.status)}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs uppercase">{job.output_format}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {job.status === "done" && job.download_url && (
                          <a href={`/api${job.download_url}`} download>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              <Download className="w-3 h-3 mr-1" /> Tải
                            </Button>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Templates list from API */}
        <div className="bg-card rounded-xl border border-border animate-fade-in">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-display font-semibold">Templates</h2>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>

          {templatesLoading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {templatesError && (
            <p className="p-5 text-sm text-destructive">Không thể tải templates</p>
          )}

          {!templatesLoading && !templatesError && recentTemplates.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">Chưa có template nào</p>
          )}

          {!templatesLoading && !templatesError && recentTemplates.length > 0 && (
            <div className="divide-y divide-border">
              {recentTemplates.map((t) => (
                <div key={t.id} className="px-5 py-4">
                  <p className="text-sm font-medium truncate" title={t.name}>{t.name}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-muted-foreground">
                      {templateFieldCount(t)} fields
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {templateTableCount(t)} tables
                    </span>
                    {t.description && (
                      <span className="flex items-center gap-1 text-xs text-primary truncate max-w-[80px]" title={t.description}>
                        {t.description}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
