FROM python:3.11-slim

# Cài LibreOffice + fonts tiếng Việt
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    libreoffice-writer \
    fonts-liberation \
    fonts-dejavu \
    # Fonts hỗ trợ tiếng Việt
    fonts-urw-base35 \
    # Tránh LibreOffice crash khi headless
    libxrender1 libfontconfig1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements trước để tận dụng Docker layer cache
COPY requirements.txt .
RUN pip install --no-cache-dir \
    --trusted-host pypi.org \
    --trusted-host pypi.python.org \
    --trusted-host files.pythonhosted.org \
    --timeout 120 \
    -r requirements.txt

# Bust cache cho app code (thay đổi khi cần force rebuild)
ARG CACHEBUST=1
COPY . .

# Tạo thư mục storage
RUN mkdir -p storage/uploads storage/outputs storage/temp

# Non-root user cho security (created but we will drop privileges in entrypoint)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# copy entrypoint script and make executable
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
