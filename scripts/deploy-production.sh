#!/bin/bash
set -e

echo "=== JAIME.IO Production Deploy ==="
echo "$(date)"

cd /var/www/jaimeio

echo "Pulling latest from main..."
git checkout main
git pull origin main

echo "Building production image..."
docker build -t jaimeio-production .

echo "Restarting production container..."
docker stop jaimeio-production || true
docker rm jaimeio-production || true
docker run -d \
  --name jaimeio-production \
  --restart unless-stopped \
  -p 3001:3000 \
  --env-file /var/www/jaimeio/docker/production/.env \
  jaimeio-production

echo "Waiting for startup..."
sleep 8

echo "Production status:"
docker ps | grep jaimeio-production

echo "=== Deploy complete ==="
echo "$(date) — Production deployed" >> /var/www/jaimeio/deploy-log.txt
