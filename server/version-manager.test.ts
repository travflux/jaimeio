import { describe, it, expect } from "vitest";
import {
  getCurrentVersion,
  getVersionHistory,
  getLatestVersion,
  compareVersions,
  isUpdateAvailable,
  getUpdatesBetween,
  hasBreakingChanges,
} from "./version-manager";

describe("Version Manager", () => {
  describe("CURRENT_VERSION consistency", () => {
    it("CURRENT_VERSION should match the last entry in VERSION_HISTORY", () => {
      const current = getCurrentVersion();
      const latest = getLatestVersion();
      expect(current).toBe(latest.version);
    });

    it("CURRENT_VERSION should match package.json version", async () => {
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));
      expect(getCurrentVersion()).toBe(pkg.version);
    });

    it("VERSION_HISTORY should be sorted in ascending order", () => {
      const history = getVersionHistory();
      for (let i = 1; i < history.length; i++) {
        const cmp = compareVersions(history[i - 1].version, history[i].version);
        expect(cmp).toBeLessThan(0);
      }
    });

    it("VERSION_HISTORY should have no duplicate versions", () => {
      const history = getVersionHistory();
      const versions = history.map((v) => v.version);
      expect(new Set(versions).size).toBe(versions.length);
    });
  });

  describe("compareVersions", () => {
    it("should return -1 when v1 < v2", () => {
      expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
      expect(compareVersions("4.1.0", "4.9.1")).toBe(-1);
      expect(compareVersions("4.9.0", "4.9.1")).toBe(-1);
    });

    it("should return 0 when versions are equal", () => {
      expect(compareVersions("4.9.1", "4.9.1")).toBe(0);
      expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    });

    it("should return 1 when v1 > v2", () => {
      expect(compareVersions("2.0.0", "1.0.0")).toBe(1);
      expect(compareVersions("4.9.1", "4.1.0")).toBe(1);
    });
  });

  describe("isUpdateAvailable", () => {
    it("should return false when already on latest version", () => {
      const latest = getLatestVersion();
      expect(isUpdateAvailable(latest.version)).toBe(false);
    });

    it("should return true when on an older version", () => {
      expect(isUpdateAvailable("1.0.0")).toBe(true);
      expect(isUpdateAvailable("4.1.0")).toBe(true);
    });
  });

  describe("getUpdatesBetween", () => {
    it("should return all versions between two version numbers", () => {
      const updates = getUpdatesBetween("4.8.7", "4.9.1");
      const versions = updates.map((u) => u.version);
      expect(versions).toContain("4.9.0");
      expect(versions).toContain("4.9.1");
      expect(versions).not.toContain("4.8.7");
    });

    it("should return empty array when versions are equal", () => {
      const latest = getLatestVersion();
      const updates = getUpdatesBetween(latest.version, latest.version);
      expect(updates).toHaveLength(0);
    });
  });

  describe("hasBreakingChanges", () => {
    it("should detect breaking changes in the 2.0.0 and 3.0.0 releases", () => {
      expect(hasBreakingChanges("1.4.0", "2.0.0")).toBe(true);
      expect(hasBreakingChanges("2.0.0", "3.0.0")).toBe(true);
    });

    it("should return false for minor version bumps with no breaking changes", () => {
      expect(hasBreakingChanges("4.9.0", "4.9.1")).toBe(false);
    });
  });

  describe("VERSION_HISTORY completeness", () => {
    it("should include all major milestones", () => {
      const history = getVersionHistory();
      const versions = history.map((v) => v.version);
      expect(versions).toContain("1.0.0");
      expect(versions).toContain("2.0.0");
      expect(versions).toContain("3.0.0");
      expect(versions).toContain("4.0.0");
      expect(versions).toContain("4.9.1");
    });

    it("every entry should have a non-empty changelog", () => {
      const history = getVersionHistory();
      for (const entry of history) {
        expect(entry.changelog.length).toBeGreaterThan(0);
        for (const item of entry.changelog) {
          expect(item.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it("every entry should have a valid release date", () => {
      const history = getVersionHistory();
      for (const entry of history) {
        expect(entry.releaseDate).toBeInstanceOf(Date);
        expect(isNaN(entry.releaseDate.getTime())).toBe(false);
      }
    });
  });
});
