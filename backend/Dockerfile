FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

FROM base AS builder
WORKDIR /app

# Install Python dependencies in a separate layer so this step
# is only re-run when requirements.txt changes.
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --user --no-cache-dir -r /tmp/requirements.txt

FROM base AS runtime
WORKDIR /app

# Copy installed dependencies from builder image
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY backend /app

EXPOSE 8000


# Test image: same as runtime plus test deps; runs pytest alongside db
FROM base AS test
WORKDIR /app

COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

COPY backend/requirements-test.txt /tmp/requirements-test.txt
RUN pip install --user --no-cache-dir -r /tmp/requirements-test.txt

COPY backend /app
ENV PYTHONPATH=/app

CMD ["sh", "-c", "alembic upgrade head && pytest tests/ -v"]

