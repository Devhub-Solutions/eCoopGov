import { StatCard } from "@/components/StatCard";
import { FileText, Printer, CheckCircle2, Clock, Upload, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const recentJobs = [
  { id: "JOB-001", template: "Hợp đồng lao động", status: "done", time: "2 phút trước" },
  { id: "JOB-002", template: "Biên bản họp HTX", status: "done", time: "15 phút trước" },
  { id: "JOB-003", template: "Báo cáo tài chính Q4", status: "pending", time: "1 giờ trước" },
  { id: "JOB-004", template: "Giấy đề nghị vay vốn", status: "done", time: "3 giờ trước" },
  { id: "JOB-005", template: "Hợp đồng mua bán", status: "error", time: "5 giờ trước" },
];

const recentTemplates = [
  { name: "Hợp đồng lao động", fields: 12, tables: 1, uploads: 45 },
  { name: "Biên bản họp HTX", fields: 8, tables: 2, uploads: 32 },
  { name: "Báo cáo tài chính", fields: 15, tables: 3, uploads: 28 },
];

function statusBadge(status: string) {
  switch (status) {
    case "done":
      return <Badge className="bg-success/15 text-success border-0 text-xs">Hoàn thành</Badge>;
    case "pending":
      return <Badge className="bg-warning/15 text-warning border-0 text-xs">Đang xử lý</Badge>;
    case "error":
      return <Badge className="bg-destructive/15 text-destructive border-0 text-xs">Lỗi</Badge>;
    default:
      return null;
  }
}

const Dashboard = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Tổng quan hệ thống DocGen</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Templates"
          value={24}
          subtitle="3 mới trong tuần"
          icon={FileText}
          trend={{ value: "12%", positive: true }}
        />
        <StatCard
          title="Documents sinh"
          value="1,247"
          subtitle="Tháng này"
          icon={Printer}
          trend={{ value: "8%", positive: true }}
        />
        <StatCard
          title="Thành công"
          value="98.5%"
          subtitle="Tỉ lệ render"
          icon={CheckCircle2}
        />
        <StatCard
          title="Đang xử lý"
          value={3}
          subtitle="Jobs trong queue"
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Jobs */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border animate-fade-in">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-display font-semibold">Jobs gần đây</h2>
            <a href="/jobs" className="text-sm text-primary hover:underline">Xem tất cả →</a>
          </div>
          <div className="divide-y divide-border">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{job.template}</p>
                    <p className="text-xs text-muted-foreground">{job.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(job.status)}
                  <span className="text-xs text-muted-foreground hidden sm:inline">{job.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Templates */}
        <div className="bg-card rounded-xl border border-border animate-fade-in">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-display font-semibold">Templates phổ biến</h2>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {recentTemplates.map((t, i) => (
              <div key={i} className="px-5 py-4">
                <p className="text-sm font-medium">{t.name}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-muted-foreground">{t.fields} fields</span>
                  <span className="text-xs text-muted-foreground">{t.tables} tables</span>
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <Upload className="w-3 h-3" /> {t.uploads}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
