#!/bin/bash
set -e
ENV=${1:-production}
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
cd /var/www/jaimeio
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "[$TIMESTAMP] Deploy started: $ENV @ $COMMIT" >> /var/www/jaimeio/deploy-log.txt

if [ "$ENV" = "production" ]; then
  git fetch origin
  git checkout main
  git pull origin main
  docker build -t jaimeio-production .
  docker stop jaimeio-production 2>/dev/null || true
  docker rm jaimeio-production 2>/dev/null || true
  docker run -d --name jaimeio-production --restart unless-stopped \
    --env-file /var/www/jaimeio/docker/production/.env \
    -p 3001:3000 jaimeio-production
elif [ "$ENV" = "staging" ]; then
  git fetch origin
  git checkout staging
  git pull origin staging
  docker build -t jaimeio-staging .
  docker stop jaimeio-staging 2>/dev/null || true
  docker rm jaimeio-staging 2>/dev/null || true
  docker run -d --name jaimeio-staging --restart unless-stopped \
    --env-file /var/www/jaimeio/docker/staging/.env \
    -p 3002:3000 jaimeio-staging
fi

echo "[$TIMESTAMP] Deploy complete: $ENV" >> /var/www/jaimeio/deploy-log.txt
