import { useState } from "react";
import { FileText, Upload, Search, MoreVertical, Tag, Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const mockTemplates = [
  {
    id: "tpl-001",
    name: "Hợp đồng lao động",
    description: "Template HĐLĐ chuẩn cho HTX",
    fields: [
      { key: "ho_ten", label: "Họ và tên", type: "text" },
      { key: "ngay_sinh", label: "Ngày sinh", type: "date" },
      { key: "dia_chi", label: "Địa chỉ", type: "text" },
      { key: "chuc_vu", label: "Chức vụ", type: "text" },
    ],
    tables: [{ key: "phu_cap", columns: ["loai", "so_tien"] }],
    createdAt: "2024-12-15",
    renderCount: 45,
  },
  {
    id: "tpl-002",
    name: "Biên bản họp HTX",
    description: "Biên bản cuộc họp đại hội thành viên",
    fields: [
      { key: "ten_htx", label: "Tên HTX", type: "text" },
      { key: "ngay_hop", label: "Ngày họp", type: "date" },
      { key: "chu_toa", label: "Chủ tọa", type: "text" },
    ],
    tables: [{ key: "thanh_vien", columns: ["ten", "chuc_vu", "y_kien"] }],
    createdAt: "2024-12-20",
    renderCount: 32,
  },
  {
    id: "tpl-003",
    name: "Báo cáo tài chính quý",
    description: "Báo cáo thu chi hàng quý",
    fields: [
      { key: "ten_htx", label: "Tên HTX", type: "text" },
      { key: "quy", label: "Quý", type: "text" },
      { key: "nam", label: "Năm", type: "text" },
    ],
    tables: [
      { key: "thu_chi", columns: ["hang_muc", "thu", "chi", "ghi_chu"] },
    ],
    createdAt: "2025-01-05",
    renderCount: 28,
  },
  {
    id: "tpl-004",
    name: "Giấy đề nghị vay vốn",
    description: "Mẫu đề nghị vay vốn từ quỹ tín dụng",
    fields: [
      { key: "ho_ten", label: "Họ và tên", type: "text" },
      { key: "so_tien_vay", label: "Số tiền vay", type: "text" },
      { key: "muc_dich", label: "Mục đích vay", type: "text" },
      { key: "thoi_han", label: "Thời hạn", type: "text" },
    ],
    tables: [],
    createdAt: "2025-01-10",
    renderCount: 18,
  },
];

const Templates = () => {
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<typeof mockTemplates[0] | null>(null);

  const filtered = mockTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">Quản lý mẫu tài liệu Word</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" /> Upload Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Upload Template mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Tên template</Label>
                <Input placeholder="VD: Hợp đồng lao động" className="mt-1.5" />
              </div>
              <div>
                <Label>Mô tả</Label>
                <Textarea placeholder="Mô tả ngắn về template..." className="mt-1.5" />
              </div>
              <div>
                <Label>File Word (.docx)</Label>
                <div className="mt-1.5 border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Kéo thả file hoặc <span className="text-primary font-medium cursor-pointer">chọn file</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Chỉ chấp nhận .docx, tối đa 10MB</p>
                </div>
              </div>
              <Button className="w-full">Upload & Phân tích</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Tìm template..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((template) => (
          <div
            key={template.id}
            className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow animate-fade-in cursor-pointer"
            onClick={() => setSelectedTemplate(template)}
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <button className="text-muted-foreground hover:text-foreground p-1">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-display font-semibold mt-3">{template.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {template.fields.slice(0, 3).map((f) => (
                <Badge key={f.key} variant="secondary" className="text-xs font-normal">
                  <Tag className="w-3 h-3 mr-1" /> {f.label}
                </Badge>
              ))}
              {template.fields.length > 3 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  +{template.fields.length - 3}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {template.createdAt}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {template.renderCount} renders
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-lg">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{selectedTemplate.name}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>

              <div className="space-y-3 mt-2">
                <h4 className="text-sm font-semibold">Fields ({selectedTemplate.fields.length})</h4>
                <div className="space-y-2">
                  {selectedTemplate.fields.map((f) => (
                    <div key={f.key} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                      <div>
                        <code className="text-xs text-primary font-mono">{`{{ ${f.key} }}`}</code>
                        <p className="text-sm mt-0.5">{f.label}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{f.type}</Badge>
                    </div>
                  ))}
                </div>

                {selectedTemplate.tables.length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold mt-4">Tables ({selectedTemplate.tables.length})</h4>
                    {selectedTemplate.tables.map((t) => (
                      <div key={t.key} className="bg-muted rounded-lg px-3 py-2">
                        <code className="text-xs text-primary font-mono">{`{% for item in ${t.key} %}`}</code>
                        <div className="flex gap-1.5 mt-1.5">
                          {t.columns.map((col) => (
                            <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button className="flex-1">Render tài liệu</Button>
                <Button variant="outline">Chỉnh sửa labels</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
