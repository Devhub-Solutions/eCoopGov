"""
DOCX Service: Fill dữ liệu vào template và render ra file.
Dùng docxtpl (Jinja2-based) để xử lý placeholder + dynamic table.
"""
import asyncio
import shutil
from pathlib import Path
from docxtpl import DocxTemplate
from jinja2 import Environment, ChainableUndefined
from app.core.config import get_settings
from app.core.logging import logger

settings = get_settings()

# Jinja2 env dùng ChainableUndefined: truy cập attribute/index trên undefined → chuỗi rỗng thay vì throw
_jinja_env = Environment(undefined=ChainableUndefined)


async def render_docx(template_path: str | Path, context: dict, output_path: str | Path) -> Path:
    """
    Fill context data vào template và lưu file .docx.

    Args:
        template_path: Đường dẫn tới file template .docx
        context: Dict data để fill (hỗ trợ nested dict cho table)
        output_path: Đường dẫn lưu file output

    Returns:
        Path của file output
    """
    template_path = Path(template_path)
    output_path = Path(output_path)

    if not template_path.exists():
        raise FileNotFoundError(f"Template không tồn tại: {template_path}")

    # Chạy render trong thread pool vì docxtpl là sync
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _render_sync, template_path, context, output_path)

    logger.info("docx_rendered", output=str(output_path))
    return output_path


def _render_sync(template_path: Path, context: dict, output_path: Path):
    """Sync render - chạy trong executor để không block event loop."""
    doc = DocxTemplate(str(template_path))

    # Validation: kiểm tra context có đủ field không
    # docxtpl tự handle missing vars (render empty string)
    doc.render(context, jinja_env=_jinja_env)
    doc.save(str(output_path))
