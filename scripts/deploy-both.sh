#!/bin/bash
set -e

echo "=== Deploying both staging and production ==="
echo "$(date)"

cd /var/www/jaimeio

echo "Pulling latest from main..."
git checkout main
git pull origin main

echo "Building image..."
docker build -t jaimeio-production .
docker tag jaimeio-production jaimeio-staging

echo "Deploying production..."
docker stop jaimeio-production || true
docker rm jaimeio-production || true
docker run -d \
  --name jaimeio-production \
  --restart unless-stopped \
  -p 3001:3000 \
  --env-file /var/www/jaimeio/docker/production/.env \
  jaimeio-production

echo "Deploying staging..."
docker stop jaimeio-staging || true
docker rm jaimeio-staging || true
docker run -d \
  --name jaimeio-staging \
  --restart unless-stopped \
  -p 3002:3001 \
  --env-file /var/www/jaimeio/docker/staging/.env \
  jaimeio-staging

sleep 8
echo "Container status:"
docker ps | grep jaimeio

echo "=== Both deployed ==="
echo "$(date) — Both deployed" >> /var/www/jaimeio/deploy-log.txt
