/**
 * Simplified permission model for license users.
 *
 * All license users have the same "editor" permissions.
 * The only access distinction is:
 *   - Super admin (via /admin/login) → Mission Control + full platform
 *   - License users (via tenant login) → Publication dashboard + content tools
 */

export type LicenseRole = "owner" | "admin" | "editor" | "viewer";

// All roles get editor-level permissions (simplified model)
const EDITOR_PERMISSIONS = [
  "articles:read", "articles:write", "articles:delete", "articles:publish",
  "settings:read", "settings:write",
  "users:read",
  "analytics:read",
] as const;

export type Permission = typeof EDITOR_PERMISSIONS[number];

export function hasPermission(_role: LicenseRole, permission: Permission): boolean {
  return (EDITOR_PERMISSIONS as readonly string[]).includes(permission);
}

export function getPermissions(_role: LicenseRole): readonly string[] {
  return EDITOR_PERMISSIONS;
}

/**
 * Tier-based feature flags.
 */
export type TierFeatures = {
  maxArticlesPerMonth: number;
  maxUsers: number;
  analytics: boolean;
  api: boolean;
  whiteLabel: boolean;
  customDomain: boolean;
  prioritySupport: boolean;
};

const TIER_FEATURES: Record<string, TierFeatures> = {
  starter: {
    maxArticlesPerMonth: 50,
    maxUsers: 3,
    analytics: false,
    api: false,
    whiteLabel: false,
    customDomain: false,
    prioritySupport: false,
  },
  professional: {
    maxArticlesPerMonth: 500,
    maxUsers: 10,
    analytics: true,
    api: true,
    whiteLabel: false,
    customDomain: true,
    prioritySupport: false,
  },
  enterprise: {
    maxArticlesPerMonth: -1, // unlimited
    maxUsers: -1, // unlimited
    analytics: true,
    api: true,
    whiteLabel: true,
    customDomain: true,
    prioritySupport: true,
  },
};

export function getTierFeatures(tier: string): TierFeatures {
  return TIER_FEATURES[tier] ?? TIER_FEATURES.starter;
}
