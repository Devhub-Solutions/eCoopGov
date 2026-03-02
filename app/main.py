from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_db
from app.core.logging import setup_logging, logger
from app.api import template, render, config, fleet, auth

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    setup_logging()
    settings.ensure_dirs()
    await init_db()
    logger.info("app_started", version=settings.APP_VERSION, debug=settings.DEBUG)
    yield
    logger.info("app_stopped")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## 📄 DocGen API – Word Template → PDF

### Tính năng
- **Upload template** `.docx` (Jinja2 syntax)
- **AI auto-label** tiếng Việt cho từng field
- **Fill dữ liệu** động, bao gồm bảng lặp
- **Export PDF** giữ nguyên layout (LibreOffice)
- **Async render** cho batch processing

### Template syntax
```
{{ ho_ten }}          → scalar field
{{ ngay_sinh }}       → date field

{% for item in danh_sach %}
{{ item.ten }} | {{ item.so_tien }}
{% endfor %}
```
    """,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Thu hẹp lại trong production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(template.router)
app.include_router(render.router)
app.include_router(config.router)
app.include_router(fleet.router)

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
