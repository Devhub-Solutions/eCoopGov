import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Trash2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const templates = [
  { id: "tpl-001", name: "Hợp đồng lao động" },
  { id: "tpl-002", name: "Biên bản họp HTX" },
  { id: "tpl-003", name: "Báo cáo tài chính quý" },
  { id: "tpl-004", name: "Giấy đề nghị vay vốn" },
];

const Render = () => {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [outputFormat, setOutputFormat] = useState("pdf");
  const [renderMode, setRenderMode] = useState<"sync" | "async">("sync");
  const [tableRows, setTableRows] = useState([{ ten: "", so_tien: "" }]);

  const addRow = () => setTableRows([...tableRows, { ten: "", so_tien: "" }]);
  const removeRow = (i: number) => setTableRows(tableRows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Render tài liệu</h1>
        <p className="text-muted-foreground text-sm mt-1">Điền dữ liệu và sinh tài liệu từ template</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-5 animate-fade-in">
        {/* Template selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Chọn Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Chọn template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" /> {t.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Định dạng</Label>
              <Select value={outputFormat} onValueChange={setOutputFormat}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="docx">DOCX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chế độ</Label>
              <Select value={renderMode} onValueChange={(v) => setRenderMode(v as "sync" | "async")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sync">Sync</SelectItem>
                  <SelectItem value="async">Async</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Mock form fields based on selected template */}
        {selectedTemplate && (
          <>
            <div className="border-t border-border pt-5">
              <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
                Dữ liệu Fields
                <Badge variant="secondary" className="text-xs font-normal">Jinja2</Badge>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Họ và tên <code className="text-primary ml-1">{`{{ ho_ten }}`}</code></Label>
                  <Input placeholder="Nguyễn Văn A" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Ngày sinh <code className="text-primary ml-1">{`{{ ngay_sinh }}`}</code></Label>
                  <Input placeholder="01/01/1990" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Địa chỉ <code className="text-primary ml-1">{`{{ dia_chi }}`}</code></Label>
                  <Input placeholder="123 Đường ABC, Quận 1" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Chức vụ <code className="text-primary ml-1">{`{{ chuc_vu }}`}</code></Label>
                  <Input placeholder="Thành viên HTX" className="mt-1" />
                </div>
              </div>
            </div>

            {/* Table data */}
            <div className="border-t border-border pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                  Dữ liệu Table
                  <code className="text-xs text-primary font-mono">{`{% for item in danh_sach %}`}</code>
                </h3>
                <Button variant="outline" size="sm" onClick={addRow}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Thêm dòng
                </Button>
              </div>

              <div className="space-y-2">
                {tableRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Tên sản phẩm"
                      value={row.ten}
                      onChange={(e) => {
                        const newRows = [...tableRows];
                        newRows[i].ten = e.target.value;
                        setTableRows(newRows);
                      }}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Số tiền"
                      value={row.so_tien}
                      onChange={(e) => {
                        const newRows = [...tableRows];
                        newRows[i].so_tien = e.target.value;
                        setTableRows(newRows);
                      }}
                      className="w-40"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeRow(i)} className="shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* JSON preview */}
            <div className="border-t border-border pt-5">
              <Label className="text-xs text-muted-foreground">JSON Preview (chỉ đọc)</Label>
              <Textarea
                readOnly
                className="mt-1.5 font-mono text-xs h-24"
                value={JSON.stringify(
                  {
                    ho_ten: "Nguyễn Văn A",
                    ngay_sinh: "01/01/1990",
                    danh_sach: tableRows.filter((r) => r.ten),
                  },
                  null,
                  2
                )}
              />
            </div>

            <Button className="w-full" size="lg">
              <Download className="w-4 h-4 mr-2" />
              {renderMode === "sync" ? "Render & Tải ngay" : "Tạo job Async"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Render;
