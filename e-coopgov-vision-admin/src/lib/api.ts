// ─── Types ──────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

/** Matches backend FieldMeta */
export interface TemplateField {
  key: string;
  label: string | null;
  type: string;
  required?: boolean;
}

/** Matches backend TableMeta */
export interface TemplateTable {
  key: string;
  loop_var: string;
  columns: string[];
  column_labels: Record<string, string>;
  access?: "loop" | "index";
}

export interface TemplateMeta {
  fields: TemplateField[];
  tables: TemplateTable[];
}

/** Matches backend TemplateDetailResponse */
export interface Template {
  id: string;
  name: string;
  description: string | null;
  filename: string;
  metadata: TemplateMeta;
  label_config?: Record<string, string>;
  created_at: string;
}

export interface RenderJobResponse {
  job_id: string;
  template_id: string;
  status: "pending" | "processing" | "done" | "failed";
  download_url?: string;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}

/** Matches backend RenderJobListItem */
export interface RenderJobListItem {
  job_id: string;
  template_id: string;
  template_name: string | null;
  status: "pending" | "processing" | "done" | "failed";
  output_format: string;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
  download_url?: string | null;
  payload_hash?: string | null;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("admin_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { detail?: string }).detail ?? res.statusText;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<TokenResponse> {
  const form = new URLSearchParams({ username, password });
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  return handleResponse<TokenResponse>(res);
}

export async function getMe(): Promise<UserProfile> {
  const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders() });
  return handleResponse<UserProfile>(res);
}

// ─── Templates API ────────────────────────────────────────────────────────────

export async function getTemplates(): Promise<Template[]> {
  const res = await fetch(`${BASE}/templates/`, { headers: authHeaders() });
  return handleResponse<Template[]>(res);
}

export async function getTemplate(id: string): Promise<Template> {
  const res = await fetch(`${BASE}/templates/${id}`, { headers: authHeaders() });
  return handleResponse<Template>(res);
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await fetch(`${BASE}/templates/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? res.statusText);
  }
}

export async function uploadTemplate(file: File, name: string, description?: string): Promise<Template> {
  const form = new FormData();
  form.append("file", file);
  form.append("name", name);
  if (description) form.append("description", description);
  const res = await fetch(`${BASE}/templates/`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  return handleResponse<Template>(res);
}

export async function updateLabels(id: string, labels: Record<string, string>): Promise<Template> {
  const res = await fetch(`${BASE}/templates/${id}/labels`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ labels }),
  });
  return handleResponse<Template>(res);
}

// ─── Jobs API ─────────────────────────────────────────────────────────────────

export async function getRenderJobs(limit = 100): Promise<RenderJobListItem[]> {
  const res = await fetch(`${BASE}/render/jobs/?limit=${limit}`, { headers: authHeaders() });
  return handleResponse<RenderJobListItem[]>(res);
}

export async function getJobStatus(jobId: string): Promise<RenderJobResponse> {
  const res = await fetch(`${BASE}/render/jobs/${jobId}`, { headers: authHeaders() });
  return handleResponse<RenderJobResponse>(res);
}

// ─── Render API ───────────────────────────────────────────────────────────────

export async function renderSync(
  templateId: string,
  data: Record<string, unknown>,
  outputFormat: "pdf" | "docx" = "pdf"
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${BASE}/render/${templateId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ data, output_format: outputFormat }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? res.statusText);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename = match?.[1]?.replace(/['"]/g, "") ?? `output.${outputFormat}`;
  return { blob, filename };
}

export async function renderAsync(
  templateId: string,
  data: Record<string, unknown>,
  outputFormat: "pdf" | "docx" = "pdf"
): Promise<RenderJobResponse> {
  const res = await fetch(`${BASE}/render/${templateId}/async`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ data, output_format: outputFormat }),
  });
  return handleResponse<RenderJobResponse>(res);
}

export function downloadJobUrl(jobId: string): string {
  return `${BASE}/render/jobs/${jobId}/download`;
}

// ─── Fleet API ────────────────────────────────────────────────────────────────

export interface PhuongTienItem {
  id: string;
  bien_so: string;
  hang_xe: string | null;
  nam_san_xuat: number | null;
  so_cho: number | null;
  mau_xe: string | null;
  loai_hinh_hoat_dong: string | null;
  tuyen_khai_thac: string | null;
  han_dang_kiem: string | null;
  han_phu_hieu: string | null;
  han_bao_hiem: string | null;
  gsht_ten: string | null;
  gsht_don_vi: string | null;
  loai_so_huu: string | null;
  loai_di_thue: string | null;
  trang_thai: string | null;
  ghi_chu: string | null;
  created_at: string | null;
}

export interface LaiXeItem {
  id: string;
  ho_ten: string;
  nhiem_vu_lai_xe: string | null;
  nhiem_vu_nv_phuc_vu: string | null;
  hang_gplx: string | null;
  han_gplx: string | null;
  hop_dong_ngay_ky: string | null;
  hop_dong_loai: string | null;
  dong_bhxh_bhyt: string | null;
  ksk_ngay_kham: string | null;
  ksk_ket_qua: string | null;
  tap_huan_ngay: string | null;
  tap_huan_don_vi: string | null;
  tap_huan_so_gcn: string | null;
  trang_thai: string | null;
  ghi_chu: string | null;
  created_at: string | null;
}

export interface FleetListResponse<T> {
  total: number;
  page: number;
  size: number;
  pages: number;
  data: T[];
}

export interface ImportJobResult {
  job_id: string;
  status: string;
  progress_percent: number;
  total_rows: number | null;
  success_rows: number | null;
  error_rows: number | null;
  error_details: { row?: number; error: string }[];
  completed_at: string | null;
}

export interface PhuongTienFilter {
  q?: string; bien_so?: string; hang_xe?: string; loai_hinh?: string;
  trang_thai?: string; so_cho_min?: number; so_cho_max?: number;
  loai_so_huu?: string; loai_di_thue?: string;
  han_dang_kiem_truoc?: string; han_bao_hiem_truoc?: string;
  page?: number; size?: number;
}

export interface LaiXeFilter {
  q?: string; ho_ten?: string; hang_gplx?: string; trang_thai?: string;
  gplx_het_han_truoc?: string; nhiem_vu?: string;
  dong_bhxh_bhyt?: string; ksk_ket_qua?: string;
  ksk_het_han_truoc?: string;
  page?: number; size?: number;
}

function buildQs(params: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") p.append(k, String(v));
  }
  return p.toString();
}

export async function getPhuongTien(filter: PhuongTienFilter = {}): Promise<FleetListResponse<PhuongTienItem>> {
  const qs = buildQs(filter as Record<string, unknown>);
  const res = await fetch(`${BASE}/fleet/phuong-tien${qs ? "?" + qs : ""}`, { headers: authHeaders() });
  return handleResponse<FleetListResponse<PhuongTienItem>>(res);
}

export async function getLaiXe(filter: LaiXeFilter = {}): Promise<FleetListResponse<LaiXeItem>> {
  const qs = buildQs(filter as Record<string, unknown>);
  const res = await fetch(`${BASE}/fleet/lai-xe${qs ? "?" + qs : ""}`, { headers: authHeaders() });
  return handleResponse<FleetListResponse<LaiXeItem>>(res);
}

export async function importPhuongTien(file: File, headerRow = 4, dataStartRow = 6): Promise<{ job_id: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("header_row", String(headerRow));
  form.append("data_start_row", String(dataStartRow));
  const res = await fetch(`${BASE}/fleet/phuong-tien/import`, {
    method: "POST", headers: authHeaders(), body: form,
  });
  return handleResponse(res);
}

export async function importLaiXe(file: File, headerRow = 4, dataStartRow = 6): Promise<{ job_id: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("header_row", String(headerRow));
  form.append("data_start_row", String(dataStartRow));
  const res = await fetch(`${BASE}/fleet/lai-xe/import`, {
    method: "POST", headers: authHeaders(), body: form,
  });
  return handleResponse(res);
}

export async function getImportJob(jobId: string): Promise<ImportJobResult> {
  const res = await fetch(`${BASE}/fleet/import-jobs/${jobId}`, { headers: authHeaders() });
  return handleResponse<ImportJobResult>(res);
}

export async function exportPhuongTienBlob(filter: PhuongTienFilter = {}): Promise<{ blob: Blob; filename: string }> {
  const qs = buildQs(filter as Record<string, unknown>);
  const res = await fetch(`${BASE}/fleet/phuong-tien/export${qs ? "?" + qs : ""}`, { headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? res.statusText);
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const m = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  return { blob, filename: m?.[1]?.replace(/['"]/g, "") ?? "phuong_tien.xlsx" };
}

export async function exportLaiXeBlob(filter: LaiXeFilter = {}): Promise<{ blob: Blob; filename: string }> {
  const qs = buildQs(filter as Record<string, unknown>);
  const res = await fetch(`${BASE}/fleet/lai-xe/export${qs ? "?" + qs : ""}`, { headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? res.statusText);
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const m = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  return { blob, filename: m?.[1]?.replace(/['"]/g, "") ?? "lai_xe.xlsx" };
}
