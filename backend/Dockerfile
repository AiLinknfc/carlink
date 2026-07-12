# =====================================
# CarLink Backend — Dockerfile
# Target: Railway / AWS ECS / K8s
# =====================================

FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ------------ Runtime ------------
FROM python:3.12-slim AS runtime

WORKDIR /app

# Security: run as non-root
RUN groupadd -r carlink && useradd -r -g carlink carlink

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev tesseract-ocr tesseract-ocr-spa poppler-utils && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /usr/local
COPY app ./app

RUN chown -R carlink:carlink /app
USER carlink

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
