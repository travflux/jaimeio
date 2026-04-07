#!/bin/bash
# Local wrapper to trigger remote deploys via SSH
# Usage: ./scripts/remote-deploy.sh [deploy-production|deploy-staging|deploy-both|seed-db]
SCRIPT=${1:-deploy-both}
echo "Triggering remote: ${SCRIPT}"
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no root@5.78.200.69 \
  "bash /var/www/jaimeio/scripts/${SCRIPT}.sh"
