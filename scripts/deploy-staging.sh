#!/bin/bash
set -e

echo "=== JAIME.IO Staging Deploy ==="
echo "$(date)"

cd /var/www/jaimeio

echo "Pulling latest from staging..."
git checkout staging
git pull origin staging

echo "Building staging image..."
docker build -t jaimeio-staging .

echo "Restarting staging container..."
docker stop jaimeio-staging || true
docker rm jaimeio-staging || true
docker run -d \
  --name jaimeio-staging \
  --restart unless-stopped \
  -p 3002:3001 \
  --env-file /var/www/jaimeio/docker/staging/.env \
  jaimeio-staging

echo "Waiting for startup..."
sleep 8

echo "Staging status:"
docker ps | grep jaimeio-staging

echo "=== Staging deploy complete ==="
echo "$(date) — Staging deployed" >> /var/www/jaimeio/deploy-log.txt
