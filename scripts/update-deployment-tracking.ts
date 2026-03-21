/**
 * Update Deployment Tracking for Version 1.2.0
 * 
 * This script updates the deployment tracking system to reflect the v1.2.0 release.
 * Run this after deploying v1.2.0 to update all client deployment records.
 */

import * as deploymentUpdates from '../server/deploymentUpdates';
import { getCurrentVersion } from '../server/version-manager';

async function main() {
  console.log('🚀 Satire Engine Deployment Tracking Update\n');

  const currentVersion = getCurrentVersion();
  console.log(`Current Engine Version: ${currentVersion}\n`);

  // Get all deployment statuses
  console.log('📊 Fetching deployment statuses...');
  const statuses = await deploymentUpdates.getAllDeploymentStatuses();
  
  console.log(`Found ${statuses.length} licensed deployments\n`);

  // Show deployments needing updates
  const needingUpdate = statuses.filter(s => s.updateAvailable);
  
  if (needingUpdate.length === 0) {
    console.log('✅ All deployments are up to date!');
    return;
  }

  console.log(`⚠️  ${needingUpdate.length} deployment(s) need updating:\n`);
  
  for (const status of needingUpdate) {
    console.log(`  • ${status.clientName}`);
    console.log(`    Domain: ${status.domain}`);
    console.log(`    Current: v${status.currentVersion} → Latest: v${status.latestVersion}`);
    console.log(`    Updates: ${status.updates.length} version(s)`);
    console.log('');
  }

  // Ask for confirmation
  console.log('This script will update the deployment tracking records.');
  console.log('Note: This does NOT deploy code to client sites.');
  console.log('It only updates the version tracking in the database.\n');

  // Update all deployments
  console.log('🔄 Updating deployment records...\n');
  const results = await deploymentUpdates.updateAllDeployments();

  // Show results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successfully updated: ${successful.length}`);
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length}`);
    for (const result of failed) {
      console.log(`  • Deployment ${result.deploymentId}: ${result.error}`);
    }
  }

  console.log('\n📝 Update Summary:');
  for (const result of successful) {
    console.log(`  • Deployment ${result.deploymentId}: v${result.previousVersion} → v${result.newVersion}`);
  }

  console.log('\n✨ Deployment tracking update complete!');
  console.log('\nNext Steps:');
  console.log('1. Notify clients of v1.2.0 availability');
  console.log('2. Send deployment guide to each client');
  console.log('3. Schedule deployment assistance calls');
  console.log('4. Monitor client deployments over next 2 weeks');
}

main().catch(console.error);
