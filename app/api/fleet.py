"""
Fleet API — Import Excel & Query linh hoạt

Import:
  POST /fleet/phuong-tien/import   - Upload Excel phương tiện
  POST /fleet/lai-xe/import        - Upload Excel lái xe
  GET  /fleet/import-jobs/{id}     - Xem tiến trình import
  GET  /fleet/import-jobs/{id}/errors - Download lỗi import

Query (filter linh hoạt):
  GET  /fleet/phuong-tien          - List + filter phương tiện
  GET  /fleet/phuong-tien/{id}     - Chi tiết phương tiện
  GET  /fleet/lai-xe               - List + filter lái xe
  GET  /fleet/lai-xe/{id}          - Chi tiết lái xe
  GET  /fleet/stats                - Thống kê tổng hợp
"""
import shutil
import uuid
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, or_

from app.core.config import get_settings
from app.core.database import get_db
from app.models.fleet_models import PhuongTien, LaiXe, ImportJob, ImportStatus
from app.services.excel_import_service import import_excel

router = APIRouter(prefix="/fleet", tags=["Fleet - Phương tiện & Lái xe"])
settings = get_settings()


# ════════════════════════════════════════════════════════════════════════════
# IMPORT ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════

@router.post("/phuong-tien/import", summary="Import Excel danh sách phương tiện")
async def import_phuong_tien(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    header_row:    int  = Form(default=4, description="Dòng bắt đầu header (file Trường Phát = 4)"),
    data_start_row: int = Form(default=6, description="Dòng bắt đầu data (file Trường Phát = 6)"),
    preview: bool = Form(default=False, description="Preview: parse nhưng không lưu"),
    db: AsyncSession = Depends(get_db),
):
    return await _handle_import(file, "phuong_tien", header_row, data_start_row, preview, background_tasks, db)


@router.post("/lai-xe/import", summary="Import Excel danh sách lái xe")
async def import_lai_xe(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    header_row:    int  = Form(default=4),
    data_start_row: int = Form(default=6),
    preview: bool = Form(default=False),
    db: AsyncSession = Depends(get_db),
):
    return await _handle_import(file, "lai_xe", header_row, data_start_row, preview, background_tasks, db)


async def _handle_import(file, table, header_row, data_start_row, preview, background_tasks, db):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Chỉ chấp nhận file .xlsx hoặc .xls")

    job_id = str(uuid.uuid4())
    filepath = settings.UPLOAD_DIR / f"{job_id}_{file.filename}"
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    job = ImportJob(
        id=job_id,
        target_table=table,
        filename=file.filename,
        status=ImportStatus.PENDING,
        preview_mode=preview,
        header_row=header_row,
        data_start_row=data_start_row,
    )
    db.add(job)
    await db.flush()

    if preview:
        result = await _run_import(job_id, str(filepath), table, header_row, data_start_row, preview=True)
        return {
            "mode": "preview",
            "total_rows":  result["total"],
            "valid_rows":  result["success"],
            "error_rows":  result["errors"],
            "sample_errors": result["error_details"][:10],
            "message": "Preview xong. Gọi lại với preview=false để import thật."
        }
    else:
        background_tasks.add_task(_run_import, job_id, str(filepath), table, header_row, data_start_row, False)
        return {
            "job_id": job_id,
            "status": "pending",
            "message": f"Import đang chạy background. Poll GET /fleet/import-jobs/{job_id}",
        }


@router.get("/import-jobs/{job_id}", summary="Xem tiến trình import")
async def get_import_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ImportJob).where(ImportJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Import job không tồn tại")

    progress = 0
    if job.total_rows and job.total_rows > 0:
        progress = round(job.processed_rows / job.total_rows * 100, 1)

    return {
        "job_id": job.id,
        "table": job.target_table,
        "filename": job.filename,
        "status": job.status,
        "progress_percent": progress,
        "total_rows": job.total_rows,
        "success_rows": job.success_rows,
        "error_rows": job.error_rows,
        "created_at": job.created_at,
        "completed_at": job.completed_at,
        "error_details": json.loads(job.error_details) if job.error_details else [],
    }


@router.get("/import-jobs/{job_id}/errors", summary="Tải danh sách lỗi import")
async def get_import_errors(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ImportJob).where(ImportJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Import job không tồn tại")

    errors = json.loads(job.error_details) if job.error_details else []
    return {"job_id": job_id, "total_errors": len(errors), "errors": errors}


# ════════════════════════════════════════════════════════════════════════════
# QUERY PHƯƠNG TIỆN — Filter linh hoạt
# ════════════════════════════════════════════════════════════════════════════

@router.get("/phuong-tien", summary="Danh sách phương tiện với filter linh hoạt")
async def list_phuong_tien(
    # ── Tìm kiếm ──────────────────────────────────────
    q:            Optional[str] = Query(None, description="Tìm kiếm tổng hợp (biển số, hãng xe, loại xe)"),
    bien_so:      Optional[str] = Query(None, description="Lọc biển số (chứa)"),
    hang_xe:      Optional[str] = Query(None, description="Lọc hãng xe"),
    loai_xe:      Optional[str] = Query(None, description="Lọc loại xe"),
    # ── Filter số chỗ ─────────────────────────────────
    so_cho:       Optional[int] = Query(None, description="Số chỗ chính xác"),
    so_cho_min:   Optional[int] = Query(None, description="Số chỗ tối thiểu"),
    so_cho_max:   Optional[int] = Query(None, description="Số chỗ tối đa"),
    # ── Filter trạng thái ─────────────────────────────
    trang_thai:   Optional[str] = Query(None, description="Trạng thái (Hoạt động, Bảo dưỡng...)"),
    # ── Pagination ────────────────────────────────────
    page:    int = Query(default=1, ge=1),
    size:    int = Query(default=20, ge=1, le=500),
    # ── Sort ──────────────────────────────────────────
    sort_by: str = Query(default="bien_so", description="Field để sort"),
    order:   str = Query(default="asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PhuongTien)

    # Full-text search
    if q:
        q_like = f"%{q}%"
        stmt = stmt.where(or_(
            PhuongTien.bien_so.ilike(q_like),
            PhuongTien.hang_xe.ilike(q_like),
            PhuongTien.loai_xe.ilike(q_like),
        ))

    # Filters
    if bien_so:      stmt = stmt.where(PhuongTien.bien_so.ilike(f"%{bien_so}%"))
    if hang_xe:      stmt = stmt.where(PhuongTien.hang_xe.ilike(f"%{hang_xe}%"))
    if loai_xe:      stmt = stmt.where(PhuongTien.loai_xe.ilike(f"%{loai_xe}%"))
    if trang_thai:   stmt = stmt.where(PhuongTien.trang_thai == trang_thai)
    if so_cho:       stmt = stmt.where(PhuongTien.so_cho == so_cho)
    if so_cho_min:   stmt = stmt.where(PhuongTien.so_cho >= so_cho_min)
    if so_cho_max:   stmt = stmt.where(PhuongTien.so_cho <= so_cho_max)

    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()

    # Sort
    sort_col = getattr(PhuongTien, sort_by, PhuongTien.bien_so)
    stmt = stmt.order_by(sort_col.asc() if order == "asc" else sort_col.desc())

    # Paginate
    stmt = stmt.offset((page - 1) * size).limit(size)
    rows = (await db.execute(stmt)).scalars().all()

    return {
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
        "data": [_pt_to_dict(r) for r in rows],
    }


@router.get("/phuong-tien/{pt_id}", summary="Chi tiết phương tiện")
async def get_phuong_tien(pt_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PhuongTien).where(PhuongTien.id == pt_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Phương tiện không tồn tại")
    return _pt_to_dict(row)


# ════════════════════════════════════════════════════════════════════════════
# QUERY LÁI XE — Filter linh hoạt
# ════════════════════════════════════════════════════════════════════════════

@router.get("/lai-xe", summary="Danh sách lái xe với filter linh hoạt")
async def list_lai_xe(
    q:              Optional[str] = Query(None, description="Tìm kiếm tổng hợp (họ tên, GPLX, SĐT)"),
    ho_ten:         Optional[str] = Query(None),
    so_gplx:        Optional[str] = Query(None),
    hang_gplx:      Optional[str] = Query(None, description="B2, C, D, E..."),
    so_dien_thoai:  Optional[str] = Query(None),
    trang_thai:     Optional[str] = Query(None),
    # Lọc theo hạn GPLX
    gplx_het_han_truoc: Optional[str] = Query(None, description="GPLX hết hạn trước ngày (YYYY-MM-DD)"),
    page:  int = Query(default=1, ge=1),
    size:  int = Query(default=20, ge=1, le=500),
    sort_by: str = Query(default="ho_ten"),
    order:   str = Query(default="asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(LaiXe)

    if q:
        q_like = f"%{q}%"
        stmt = stmt.where(or_(
            LaiXe.ho_ten.ilike(q_like),
            LaiXe.so_gplx.ilike(q_like),
            LaiXe.so_dien_thoai.ilike(q_like),
            LaiXe.so_cmnd_cccd.ilike(q_like),
        ))

    if ho_ten:          stmt = stmt.where(LaiXe.ho_ten.ilike(f"%{ho_ten}%"))
    if so_gplx:         stmt = stmt.where(LaiXe.so_gplx.ilike(f"%{so_gplx}%"))
    if hang_gplx:       stmt = stmt.where(LaiXe.hang_gplx == hang_gplx)
    if so_dien_thoai:   stmt = stmt.where(LaiXe.so_dien_thoai.ilike(f"%{so_dien_thoai}%"))
    if trang_thai:      stmt = stmt.where(LaiXe.trang_thai == trang_thai)
    if gplx_het_han_truoc:
        stmt = stmt.where(LaiXe.han_gplx <= gplx_het_han_truoc)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar()

    sort_col = getattr(LaiXe, sort_by, LaiXe.ho_ten)
    stmt = stmt.order_by(sort_col.asc() if order == "asc" else sort_col.desc())
    stmt = stmt.offset((page - 1) * size).limit(size)

    rows = (await db.execute(stmt)).scalars().all()

    return {
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
        "data": [_lx_to_dict(r) for r in rows],
    }


@router.get("/lai-xe/{lx_id}", summary="Chi tiết lái xe")
async def get_lai_xe(lx_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LaiXe).where(LaiXe.id == lx_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Lái xe không tồn tại")
    return _lx_to_dict(row)


# ════════════════════════════════════════════════════════════════════════════
# STATS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/stats", summary="Thống kê tổng hợp phương tiện & lái xe")
async def get_fleet_stats(db: AsyncSession = Depends(get_db)):
    # Phương tiện
    total_pt = (await db.execute(select(func.count(PhuongTien.id)))).scalar()
    pt_by_so_cho = (await db.execute(
        select(PhuongTien.so_cho, func.count().label("count"))
        .group_by(PhuongTien.so_cho)
        .order_by(PhuongTien.so_cho)
    )).all()
    pt_by_trang_thai = (await db.execute(
        select(PhuongTien.trang_thai, func.count().label("count"))
        .group_by(PhuongTien.trang_thai)
    )).all()

    # Lái xe
    total_lx = (await db.execute(select(func.count(LaiXe.id)))).scalar()
    lx_by_hang_gplx = (await db.execute(
        select(LaiXe.hang_gplx, func.count().label("count"))
        .group_by(LaiXe.hang_gplx)
        .order_by(LaiXe.hang_gplx)
    )).all()
    lx_by_trang_thai = (await db.execute(
        select(LaiXe.trang_thai, func.count().label("count"))
        .group_by(LaiXe.trang_thai)
    )).all()

    return {
        "phuong_tien": {
            "total": total_pt,
            "by_so_cho": [{"so_cho": r[0], "count": r[1]} for r in pt_by_so_cho],
            "by_trang_thai": [{"trang_thai": r[0], "count": r[1]} for r in pt_by_trang_thai],
        },
        "lai_xe": {
            "total": total_lx,
            "by_hang_gplx": [{"hang": r[0], "count": r[1]} for r in lx_by_hang_gplx],
            "by_trang_thai": [{"trang_thai": r[0], "count": r[1]} for r in lx_by_trang_thai],
        },
    }


# ════════════════════════════════════════════════════════════════════════════
# BACKGROUND IMPORT TASK
# ════════════════════════════════════════════════════════════════════════════

async def _run_import(job_id: str, filepath: str, table: str, header_row: int, data_start_row: int, preview: bool = False):
    from app.core.database import AsyncSessionLocal

    stats = {"total": 0, "success": 0, "errors": 0, "error_details": []}
    async with AsyncSessionLocal() as db:
        try:
            # Update status → processing
            result = await db.execute(select(ImportJob).where(ImportJob.id == job_id))
            job = result.scalar_one()
            job.status = ImportStatus.PROCESSING
            await db.commit()

            # Run import
            stats = await import_excel(db, filepath, table, job_id, header_row, data_start_row, preview)
            await db.commit()  # commit data import vào DB

            # Update job kết quả
            async with AsyncSessionLocal() as db2:
                result2 = await db2.execute(select(ImportJob).where(ImportJob.id == job_id))
                job2 = result2.scalar_one()
                job2.status = ImportStatus.DONE
                job2.total_rows = stats["total"]
                job2.success_rows = stats["success"]
                job2.error_rows = stats["errors"]
                job2.error_details = json.dumps(stats["error_details"], ensure_ascii=False) if stats["error_details"] else None
                job2.completed_at = datetime.now(timezone.utc)
                await db2.commit()

        except Exception as e:
            async with AsyncSessionLocal() as db_err:
                result3 = await db_err.execute(select(ImportJob).where(ImportJob.id == job_id))
                job3 = result3.scalar_one_or_none()
                if job3:
                    job3.status = ImportStatus.FAILED
                    job3.error_details = json.dumps([{"error": str(e)}])
                    job3.completed_at = datetime.now(timezone.utc)
                    await db_err.commit()

    return stats


# ─── Helpers ────────────────────────────────────────────────────────────────
def _pt_to_dict(r: PhuongTien) -> dict:
    return {
        "id": r.id, "bien_so": r.bien_so, "hang_xe": r.hang_xe,
        "loai_xe": r.loai_xe, "mau_xe": r.mau_xe, "nam_san_xuat": r.nam_san_xuat,
        "so_cho": r.so_cho, "trong_tai": r.trong_tai,
        "so_dang_ky": r.so_dang_ky, "han_dang_kiem": r.han_dang_kiem,
        "han_bao_hiem": r.han_bao_hiem, "trang_thai": r.trang_thai,
        "ghi_chu": r.ghi_chu, "so_may": r.so_may, "so_khung": r.so_khung,
    }

def _lx_to_dict(r: LaiXe) -> dict:
    return {
        "id": r.id, "ma_lai_xe": r.ma_lai_xe, "ho_ten": r.ho_ten,
        "ngay_sinh": r.ngay_sinh, "gioi_tinh": r.gioi_tinh,
        "so_cmnd_cccd": r.so_cmnd_cccd, "dia_chi": r.dia_chi,
        "so_dien_thoai": r.so_dien_thoai, "so_gplx": r.so_gplx,
        "hang_gplx": r.hang_gplx, "ngay_cap_gplx": r.ngay_cap_gplx,
        "han_gplx": r.han_gplx, "noi_cap_gplx": r.noi_cap_gplx,
        "trang_thai": r.trang_thai, "ghi_chu": r.ghi_chu,
    }
