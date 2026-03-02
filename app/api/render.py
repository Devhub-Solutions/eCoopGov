"""
Render API:
  POST /render/{template_id}          - Render sync (nhỏ, nhanh)
  POST /render/{template_id}/async    - Render async → job_id
  GET  /render/jobs/{job_id}          - Check job status
  GET  /render/jobs/{job_id}/download - Download kết quả
"""
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import get_db, Template, RenderJob, RenderStatus
from app.services.docx_service import render_docx
from app.services.pdf_service import convert_to_pdf
from app.models.schema import RenderRequest, RenderJobResponse, RenderJobStatus

router = APIRouter(prefix="/render", tags=["Render"])
settings = get_settings()


@router.post("/{template_id}", summary="Render sync – trả về file ngay")
async def render_sync(
    template_id: str,
    payload: RenderRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Render template với dữ liệu → trả về file PDF/DOCX ngay.
    Phù hợp cho file nhỏ, timeout thấp.
    """
    template = await _get_template_or_404(template_id, db)
    output_path = await _do_render(template, payload)

    media_type = "application/pdf" if payload.output_format == "pdf" else \
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return FileResponse(
        path=str(output_path),
        media_type=media_type,
        filename=output_path.name,
    )


@router.post("/{template_id}/async", response_model=RenderJobResponse, status_code=202,
             summary="Render async – nhận job_id, poll để lấy kết quả")
async def render_async(
    template_id: str,
    payload: RenderRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Tạo render job chạy background. Phù hợp cho file lớn, batch processing.
    Poll GET /render/jobs/{job_id} để kiểm tra status.
    """
    await _get_template_or_404(template_id, db)

    job = RenderJob(
        id=str(uuid.uuid4()),
        template_id=template_id,
        status=RenderStatus.PENDING,
        input_data={"data": payload.data, "output_format": payload.output_format},
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)  # load server-default values (created_at)

    # Chạy background (production nên dùng Celery worker)
    background_tasks.add_task(_background_render, job.id, template_id, payload)

    return RenderJobResponse(
        job_id=job.id,
        template_id=template_id,
        status=RenderJobStatus.PENDING,
        created_at=job.created_at,
    )


@router.get("/jobs/{job_id}", response_model=RenderJobResponse)
async def get_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    """Kiểm tra trạng thái render job."""
    job = await _get_job_or_404(job_id, db)

    download_url = None
    if job.status == RenderStatus.DONE and job.output_path:
        download_url = f"/render/jobs/{job_id}/download"

    return RenderJobResponse(
        job_id=job.id,
        template_id=job.template_id,
        status=RenderJobStatus(job.status),
        download_url=download_url,
        error_message=job.error_message,
        created_at=job.created_at,
        completed_at=job.completed_at,
    )


@router.get("/jobs/{job_id}/download", summary="Download kết quả render")
async def download_job_result(job_id: str, db: AsyncSession = Depends(get_db)):
    """Download file output của render job."""
    job = await _get_job_or_404(job_id, db)

    if job.status != RenderStatus.DONE:
        raise HTTPException(status_code=400, detail=f"Job chưa hoàn thành: {job.status}")

    output_path = Path(job.output_path)
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="File output không tồn tại")

    media_type = "application/pdf" if output_path.suffix == ".pdf" else \
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return FileResponse(path=str(output_path), media_type=media_type, filename=output_path.name)


# ─── Background task ────────────────────────────────────────────────────────────

async def _background_render(job_id: str, template_id: str, payload: RenderRequest):
    """Chạy render trong background, cập nhật job status."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(RenderJob).where(RenderJob.id == job_id))
            job = result.scalar_one()
            job.status = RenderStatus.PROCESSING

            template_result = await db.execute(select(Template).where(Template.id == template_id))
            template = template_result.scalar_one()

            output_path = await _do_render(template, payload)

            job.status = RenderStatus.DONE
            job.output_path = str(output_path)
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()

        except Exception as e:
            job.status = RenderStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            await db.commit()


# ─── Core render logic ──────────────────────────────────────────────────────────

async def _do_render(template: Template, payload: RenderRequest) -> Path:
    job_id = uuid.uuid4().hex
    temp_docx = settings.TEMP_DIR / f"{job_id}.docx"

    try:
        await render_docx(template.filepath, payload.data, temp_docx)

        if payload.output_format == "pdf":
            output_path = await convert_to_pdf(temp_docx, settings.OUTPUT_DIR)
        else:
            output_path = settings.OUTPUT_DIR / f"{job_id}.docx"
            temp_docx.rename(output_path)

        return output_path

    finally:
        temp_docx.unlink(missing_ok=True)


# ─── Helpers ────────────────────────────────────────────────────────────────────

async def _get_template_or_404(template_id: str, db: AsyncSession) -> Template:
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template không tồn tại")
    return template


async def _get_job_or_404(job_id: str, db: AsyncSession) -> RenderJob:
    result = await db.execute(select(RenderJob).where(RenderJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job không tồn tại")
    return job
