# syntax=docker/dockerfile:1
FROM nginx:1.27-alpine

# Serve a placeholder page — repository contains no application source yet.
RUN mkdir -p /usr/share/nginx/html && \
    printf '<!doctype html><html><head><meta charset="utf-8"><title>RecipeBox</title>\n<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:4rem auto;padding:0 1rem;color:#222}h1{margin-bottom:0.25rem}small{color:#666}</style></head>\n<body><h1>RecipeBox</h1><p>The application source has not been added to this repository yet.</p><small>Deployed placeholder — Colossus.</small></body></html>\n' > /usr/share/nginx/html/index.html

# nginx config: root serves the placeholder; return 200 on /healthz for smoke tests.
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location = /healthz { access_log off; return 200 "ok"; }\n  location / { try_files $uri $uri/ /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
