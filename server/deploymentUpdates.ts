/**
 * Deployment Updates Module
 * Manages software updates for licensed deployments
 */

import * as db from './db';
import { getCurrentVersion, getLatestVersion, isUpdateAvailable, getUpdatesBetween } from './version-manager';

export interface DeploymentUpdateStatus {
  deploymentId: number;
  clientName: string;
  domain: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  updates: Array<{
    version: string;
    releaseDate: Date;
    changelog: string[];
    breaking: boolean;
  }>;
}

export interface UpdateResult {
  deploymentId: number;
  success: boolean;
  previousVersion: string;
  newVersion: string;
  error?: string;
}

/**
 * Get update status for all licensed deployments
 */
export async function getAllDeploymentStatuses(): Promise<DeploymentUpdateStatus[]> {
  const licenses = await db.getAllLicenses();
  const deployments = await db.getAllDeployments();
  const latestVersion = getLatestVersion();

  const statuses: DeploymentUpdateStatus[] = [];

  for (const deployment of deployments) {
    const license = licenses.find(l => l.id === deployment.licenseId);
    if (!license) continue;

    const updateAvailable = isUpdateAvailable(deployment.engineVersion);
    const updates = updateAvailable 
      ? getUpdatesBetween(deployment.engineVersion, latestVersion.version)
      : [];

    statuses.push({
      deploymentId: deployment.id,
      clientName: license.clientName,
      domain: license.domain,
      currentVersion: deployment.engineVersion,
      latestVersion: latestVersion.version,
      updateAvailable,
      updates,
    });
  }

  return statuses;
}

/**
 * Update a single deployment to the latest version
 */
export async function updateDeployment(deploymentId: number): Promise<UpdateResult> {
  try {
    const deployment = await db.getDeploymentById(deploymentId);
    if (!deployment) {
      return {
        deploymentId,
        success: false,
        previousVersion: 'unknown',
        newVersion: getCurrentVersion(),
        error: 'Deployment not found',
      };
    }

    const previousVersion = deployment.engineVersion;
    const newVersion = getCurrentVersion();

    // Update the deployment version in the database
    await db.updateDeployment(deploymentId, {
      engineVersion: newVersion,
    });

    return {
      deploymentId,
      success: true,
      previousVersion,
      newVersion,
    };
  } catch (error) {
    return {
      deploymentId,
      success: false,
      previousVersion: 'unknown',
      newVersion: getCurrentVersion(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update all deployments to the latest version
 */
export async function updateAllDeployments(): Promise<UpdateResult[]> {
  const deployments = await db.getAllDeployments();
  const results: UpdateResult[] = [];

  for (const deployment of deployments) {
    const result = await updateDeployment(deployment.id);
    results.push(result);
  }

  return results;
}

/**
 * Get deployments that need updates
 */
export async function getDeploymentsNeedingUpdate(): Promise<DeploymentUpdateStatus[]> {
  const allStatuses = await getAllDeploymentStatuses();
  return allStatuses.filter(status => status.updateAvailable);
}
