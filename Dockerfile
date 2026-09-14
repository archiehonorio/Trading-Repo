FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000

# Build the TA-Lib C library (needed by the `ta-lib` Python package)
ARG TA_LIB_VERSION=0.6.4
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential wget ca-certificates \
    && wget -q https://github.com/ta-lib/ta-lib/releases/download/v${TA_LIB_VERSION}/ta-lib-${TA_LIB_VERSION}-src.tar.gz \
    && tar -xzf ta-lib-${TA_LIB_VERSION}-src.tar.gz \
    && cd ta-lib-${TA_LIB_VERSION} && ./configure --prefix=/usr && make -j"$(nproc)" && make install \
    && cd .. && rm -rf ta-lib-${TA_LIB_VERSION} ta-lib-${TA_LIB_VERSION}-src.tar.gz \
    && apt-get purge -y wget && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN useradd --create-home --uid 10001 app && chown -R app:app /app
USER app

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"5000\")}/', timeout=8)"

# Flask-SocketIO runs in threading mode: one worker, many threads.
CMD ["sh", "-c", "exec gunicorn app:app --bind 0.0.0.0:${PORT} --workers 1 --threads 32 --timeout 120"]
