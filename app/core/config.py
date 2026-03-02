from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    APP_NAME: str = "DocGen API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "mysql+aiomysql://docgen:docgenpassword@db:3306/docgen"

    # Storage
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "storage" / "uploads"
    OUTPUT_DIR: Path = BASE_DIR / "storage" / "outputs"
    TEMP_DIR: Path = BASE_DIR / "storage" / "temp"

    # LibreOffice
    LIBREOFFICE_BIN: str = "libreoffice"

    # Ollama Cloud AI (cho auto-label)
    OLLAMA_API_KEY: str = "658916e60a664876bfed75d75c9c717d.O9cj7KJSt4_zw5kmMFfNnorf"  # Lấy tại https://ollama.com/settings/keys
    AI_ENABLED: bool = True

    # Rate limiting
    MAX_CONCURRENT_RENDERS: int = 10
    RENDER_TIMEOUT_SECONDS: int = 60

    # API Key (đơn giản, có thể nâng lên JWT sau)
    API_SECRET_KEY: str = "changeme-in-production"

    def ensure_dirs(self):
        for d in [self.UPLOAD_DIR, self.OUTPUT_DIR, self.TEMP_DIR]:
            d.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
