# syntax=docker/dockerfile:1
# Real-build backend image (combo known_good_dockerfiles=false: the pipeline TRUSTS
# this file). Python analogue of the JS stacks' migrate-then-start CMD: ensure tables
# (init_db) then serve. PORT=3000 keeps the multi-service saga + nginx /api proxy reused.
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 3000
CMD sh -c 'python -m app.init_db || true; python seed.py || true; uvicorn app.main:app --host 0.0.0.0 --port 3000'
