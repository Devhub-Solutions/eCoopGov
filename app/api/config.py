"""
Config API: Quản lý runtime config không cần restart.
  GET  /config/      - Xem config hiện tại
  PATCH /config/     - Update config runtime
"""
from fastapi import APIRouter
from app.core.config import get_settings
from app.models.schema import AppConfigUpdate, AppConfigResponse

router = APIRouter(prefix="/config", tags=["Config"])
settings = get_settings()

# In-memory override (production nên lưu DB hoặc Redis)
_runtime_overrides: dict = {}


@router.get("/", response_model=AppConfigResponse)
async def get_config():
    """Xem config hiện tại của hệ thống."""
    return AppConfigResponse(
        ai_enabled=_runtime_overrides.get("ai_enabled", settings.AI_ENABLED),
        ai_model=settings.AI_MODEL,
        max_concurrent_renders=_runtime_overrides.get("max_concurrent_renders", settings.MAX_CONCURRENT_RENDERS),
        render_timeout_seconds=_runtime_overrides.get("render_timeout_seconds", settings.RENDER_TIMEOUT_SECONDS),
        libreoffice_bin=settings.LIBREOFFICE_BIN,
    )


@router.patch("/", response_model=AppConfigResponse)
async def update_config(payload: AppConfigUpdate):
    """
    Update runtime config. Không cần restart service.
    Lưu ý: Reset khi restart container, lưu vào .env để persist.
    """
    if payload.ai_enabled is not None:
        _runtime_overrides["ai_enabled"] = payload.ai_enabled
        settings.AI_ENABLED = payload.ai_enabled  # type: ignore

    if payload.max_concurrent_renders is not None:
        _runtime_overrides["max_concurrent_renders"] = payload.max_concurrent_renders
        settings.MAX_CONCURRENT_RENDERS = payload.max_concurrent_renders  # type: ignore
        
    if payload.render_timeout_seconds is not None:
        _runtime_overrides["render_timeout_seconds"] = payload.render_timeout_seconds
        settings.RENDER_TIMEOUT_SECONDS = payload.render_timeout_seconds  # type: ignore
    return await get_config()
