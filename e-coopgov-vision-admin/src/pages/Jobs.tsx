import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, RefreshCw, FileText } from "lucide-react";
import { useState } from "react";

const mockJobs = [
  { id: "abc123", templateName: "Hợp đồng lao động", status: "done", format: "pdf", createdAt: "2025-03-02 10:30", duration: "2.3s" },
  { id: "def456", templateName: "Biên bản họp HTX", status: "done", format: "pdf", createdAt: "2025-03-02 10:15", duration: "1.8s" },
  { id: "ghi789", templateName: "Báo cáo tài chính Q4", status: "pending", format: "pdf", createdAt: "2025-03-02 09:45", duration: "-" },
  { id: "jkl012", templateName: "Giấy đề nghị vay vốn", status: "done", format: "docx", createdAt: "2025-03-01 16:20", duration: "1.2s" },
  { id: "mno345", templateName: "Hợp đồng mua bán", status: "error", format: "pdf", createdAt: "2025-03-01 15:00", duration: "-" },
  { id: "pqr678", templateName: "Biên bản họp HTX", status: "done", format: "pdf", createdAt: "2025-03-01 14:30", duration: "2.1s" },
  { id: "stu901", templateName: "Hợp đồng lao động", status: "done", format: "docx", createdAt: "2025-03-01 11:00", duration: "1.5s" },
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

const Jobs = () => {
  const [search, setSearch] = useState("");

  const filtered = mockJobs.filter(
    (j) =>
      j.templateName.toLowerCase().includes(search.toLowerCase()) ||
      j.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Render Jobs</h1>
          <p className="text-muted-foreground text-sm mt-1">Theo dõi trạng thái các tác vụ render</p>
        </div>
        <Button variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên template hoặc job ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Job ID</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Template</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Trạng thái</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Format</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Thời gian</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Duration</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((job) => (
                <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <code className="text-xs font-mono text-primary">{job.id}</code>
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      {job.templateName}
                    </span>
                  </td>
                  <td className="px-5 py-3">{statusBadge(job.status)}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className="text-xs uppercase">{job.format}</Badge>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{job.createdAt}</td>
                  <td className="px-5 py-3 text-muted-foreground">{job.duration}</td>
                  <td className="px-5 py-3 text-right">
                    {job.status === "done" && (
                      <Button variant="ghost" size="sm">
                        <Download className="w-3.5 h-3.5 mr-1" /> Tải
                      </Button>
                    )}
                    {job.status === "pending" && (
                      <Button variant="ghost" size="sm">
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Poll
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Jobs;
