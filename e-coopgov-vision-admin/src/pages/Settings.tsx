import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Cpu, Server, Database, Shield } from "lucide-react";

const SettingsPage = () => {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Cấu hình hệ thống</h1>
        <p className="text-muted-foreground text-sm mt-1">Quản lý cài đặt DocGen API</p>
      </div>

      {/* AI Config */}
      <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Cpu className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold">AI Auto-Label</h2>
            <p className="text-xs text-muted-foreground">Claude Haiku tự động gán nhãn tiếng Việt</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Bật AI Label</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Tự động gán nhãn khi upload template</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div>
            <Label>API Key</Label>
            <Input type="password" value="sk-ant-••••••••••••" readOnly className="mt-1.5 font-mono text-xs" />
            <p className="text-xs text-muted-foreground mt-1">Được lưu trong biến môi trường ANTHROPIC_API_KEY</p>
          </div>
        </div>
      </div>

      {/* Render Config */}
      <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Server className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold">Render Engine</h2>
            <p className="text-xs text-muted-foreground">Cấu hình LibreOffice & concurrent rendering</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max Concurrent Renders</Label>
              <Input type="number" defaultValue={10} className="mt-1.5" />
            </div>
            <div>
              <Label>Retry Attempts</Label>
              <Input type="number" defaultValue={3} className="mt-1.5" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Parallel Safety</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Semaphore + unique LibreOffice profile</p>
            </div>
            <Badge className="bg-success/15 text-success border-0 text-xs">Đã bật</Badge>
          </div>
        </div>
      </div>

      {/* Database Config */}
      <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold">Database</h2>
            <p className="text-xs text-muted-foreground">SQLite async (SQLAlchemy)</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Engine</span>
            <Badge variant="outline" className="text-xs">SQLite (aiosqlite)</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Database file</span>
            <code className="text-xs text-muted-foreground font-mono">docgen.db</code>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Tables</span>
            <span className="text-sm text-muted-foreground">templates, render_jobs</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Structured Logging</span>
            <Badge className="bg-success/15 text-success border-0 text-xs">structlog JSON</Badge>
          </div>
        </div>
      </div>

      {/* API Info */}
      <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold">API Endpoint</h2>
            <p className="text-xs text-muted-foreground">Base URL cho frontend integration</p>
          </div>
        </div>
        <div>
          <Label>API Base URL</Label>
          <Input defaultValue="http://localhost:8000" className="mt-1.5 font-mono text-sm" />
          <p className="text-xs text-muted-foreground mt-1">Swagger docs: /docs</p>
        </div>
      </div>

      <Button size="lg">
        <Save className="w-4 h-4 mr-2" /> Lưu cấu hình
      </Button>
    </div>
  );
};

export default SettingsPage;
