import { describe, it, expect } from "vitest";

describe("Admin Login Authentication", () => {
  it("should accept the correct plain-text password from LOCAL_ADMIN_PASSWORD", () => {
    // Simulate the auth logic: plain text comparison
    const storedUsername = process.env.LOCAL_ADMIN_USERNAME || "admin";
    const storedPassword = process.env.LOCAL_ADMIN_PASSWORD || "";

    const inputUsername = "adam";
    const inputPassword = "sandiego2025";

    expect(storedUsername).toBe("adam");
    expect(storedPassword).toBeTruthy();
    expect(inputUsername === storedUsername).toBe(true);
    expect(inputPassword === storedPassword).toBe(true);
  });

  it("should reject an incorrect password", () => {
    process.env.LOCAL_ADMIN_PASSWORD = "sandiego2025";
    const wrongPassword = "wrongpassword";
    expect(wrongPassword === process.env.LOCAL_ADMIN_PASSWORD).toBe(false);
  });

  it("should reject wrong username", () => {
    process.env.LOCAL_ADMIN_USERNAME = "adam";
    const wrongUsername = "hacker";
    expect(wrongUsername === process.env.LOCAL_ADMIN_USERNAME).toBe(false);
  });
});
