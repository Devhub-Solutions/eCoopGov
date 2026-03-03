from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, DateTime, Text, JSON, Integer, Enum, Boolean
from sqlalchemy.sql import func
import uuid
import enum
from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


class RenderStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class User(Base):
    __tablename__ = "users"

    id            = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email         = Column(String(255), nullable=False, unique=True, index=True)
    username      = Column(String(100), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name     = Column(String(255), nullable=True)
    is_active     = Column(Boolean, default=True, nullable=False)
    is_admin      = Column(Boolean, default=False, nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())


class Template(Base):
    __tablename__ = "templates"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    # Metadata được parse + AI label
    field_metadata = Column(JSON, nullable=True)
    # Config label do user override qua API
    label_config = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class RenderJob(Base):
    __tablename__ = "render_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    template_id = Column(String(36), nullable=False)
    status = Column(Enum(RenderStatus), default=RenderStatus.PENDING)
    input_data = Column(JSON, nullable=False)
    output_path = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)
    payload_hash = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    # Import models để SQLAlchemy biết các bảng cần tạo
    from app.models import fleet_models  # noqa: F401
    import functools
    from sqlalchemy.exc import OperationalError
    from sqlalchemy import text
    import asyncio

    async with engine.begin() as conn:
        # metadata.create_all occasionally fails with MySQL 1684 when the
        # table definition is being modified by another connection.  This can
        # happen when multiple containers start simultaneously or a manual
        # migration runs.  We retry a few times rather than letting the
        # entire application crash.
        for attempt in range(5):
            try:
                await conn.run_sync(functools.partial(Base.metadata.create_all, checkfirst=True))
                break
            except OperationalError as e:
                msg = str(e.orig).lower()
                if "1050" in msg or "already exists" in msg:
                    # harmless duplicate table error
                    break
                if "1684" in msg or "being modified" in msg:
                    # concurrent DDL, try again after delay
                    if attempt < 4:
                        await asyncio.sleep(1)
                        continue
                # anything else; re‑raise
                raise

        # Add payload_hash column if not exists (safe migration)
        try:
            await conn.execute(
                text("ALTER TABLE render_jobs ADD COLUMN payload_hash VARCHAR(64) NULL")
            )
        except Exception:
            pass  # Column already exists

        try:
            await conn.execute(
                text("ALTER TABLE render_jobs ADD INDEX idx_payload_hash (payload_hash)")
            )
        except Exception:
            pass  # Index already exists
