# 📄 DocGen API

Hệ thống sinh tài liệu từ Word template → fill dữ liệu động → export PDF.

## ✨ Điểm nổi bật so với bản ChatGPT

| Tính năng | ChatGPT version | Bản này |
|---|---|---|
| Database | Không có | SQLite async (SQLAlchemy) |
| AI auto-label | Không | ✅ Claude Haiku tự label tiếng Việt |
| Config qua API | Không | ✅ PATCH /config/ |
| Async render | Không | ✅ Background job + poll |
| Retry LibreOffice | Không | ✅ tenacity 3 lần |
| Parallel safety | Không | ✅ Semaphore + unique LO profile |
| Logging | print() | ✅ structlog JSON |
| Word split-run bug | Chưa xử lý | ✅ Merge runs trước khi parse |

---

## 🚀 Quick Start

### 1. Clone & cấu hình

```bash
cp .env.example .env
# Điền ANTHROPIC_API_KEY vào .env
```

### 2. Chạy với Docker (Khuyến nghị)

```bash
docker compose up --build
```

Hoặc với Nginx (production):
```bash
docker compose --profile production up --build
```

### 3. Chạy local (dev)

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

---

## 📡 API Reference

### Templates

#### Upload template
```bash
curl -X POST http://localhost:8000/templates/ \
  -F "file=@template.docx" \
  -F "name=Hợp đồng lao động" \
  -F "description=Template HĐLĐ chuẩn"
```

Response:
```json
{
  "id": "uuid-...",
  "name": "Hợp đồng lao động",
  "metadata": {
    "fields": [
      {"key": "ho_ten", "label": "Họ và tên", "type": "text"},
      {"key": "ngay_sinh", "label": "Ngày sinh", "type": "date"}
    ],
    "tables": [
      {"key": "danh_sach", "columns": ["ten", "so_tien"]}
    ]
  }
}
```

#### Override labels (nếu AI generate chưa đúng)
```bash
curl -X PATCH http://localhost:8000/templates/{id}/labels \
  -H "Content-Type: application/json" \
  -d '{"labels": {"ho_ten": "Tên đầy đủ của nhân viên"}}'
```

---

### Render

#### Sync (nhận file ngay)
```bash
curl -X POST http://localhost:8000/render/{template_id} \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "ho_ten": "Nguyễn Văn A",
      "ngay_sinh": "01/01/1990",
      "danh_sach": [
        {"ten": "Sản phẩm A", "so_tien": "1.000.000"},
        {"ten": "Sản phẩm B", "so_tien": "2.000.000"}
      ]
    },
    "output_format": "pdf"
  }' \
  --output result.pdf
```

#### Async (batch, file lớn)
```bash
# 1. Tạo job
curl -X POST http://localhost:8000/render/{template_id}/async \
  -H "Content-Type: application/json" \
  -d '{"data": {...}, "output_format": "pdf"}'
# → {"job_id": "abc123", "status": "pending"}

# 2. Poll status
curl http://localhost:8000/render/jobs/abc123
# → {"status": "done", "download_url": "/render/jobs/abc123/download"}

# 3. Download
curl http://localhost:8000/render/jobs/abc123/download -o result.pdf
```

---

### Config

```bash
# Xem config
curl http://localhost:8000/config/

# Tắt AI (tiết kiệm cost khi không cần)
curl -X PATCH http://localhost:8000/config/ \
  -H "Content-Type: application/json" \
  -d '{"ai_enabled": false}'

# Tăng concurrent renders
curl -X PATCH http://localhost:8000/config/ \
  -d '{"max_concurrent_renders": 20}'
```

---

## 📝 Template Syntax (Jinja2)

```
{{ ho_ten }}              ← scalar field
{{ ngay_sinh }}           ← date field

{% for item in danh_sach %}
{{ item.ten }} | {{ item.so_tien }}
{% endfor %}

{% if co_phu_luc %}
Phụ lục: {{ ten_phu_luc }}
{% endif %}
```

Xem ví dụ đầy đủ trong `templates/TEMPLATE_GUIDE.txt`

---

## 🏗️ Kiến trúc

```
Client
  ↓
Nginx (port 80)
  ↓
FastAPI (port 8000, 4 workers)
  ├── POST /templates/     → Parse + AI label → SQLite
  ├── POST /render/sync    → docxtpl → LibreOffice → PDF
  ├── POST /render/async   → BackgroundTask → Job DB
  └── PATCH /config/       → Runtime config

SQLite (docgen.db)
  ├── templates (metadata, labels)
  └── render_jobs (status, output_path)

Storage/
  ├── uploads/   (template .docx)
  ├── outputs/   (rendered PDF/DOCX)
  └── temp/      (temp files + LO profiles)
```

## 📈 Scale lên 100k doc/ngày

Khi cần scale lớn hơn:
1. Thay SQLite → **PostgreSQL** (asyncpg)
2. Thay BackgroundTasks → **Celery + Redis** worker
3. Thay local storage → **S3/MinIO**
4. Tách **PDF Worker** thành service riêng (LibreOffice nặng)
5. **Kubernetes** autoscale PDF workers theo queue depth
