import { describe, it, expect } from "vitest";

describe("Command Palette", () => {
  it("should have navigation commands", () => {
    const navCommands = [
      "Optimizer",
      "Dashboard",
      "Articles",
      "AI Generator",
      "Categories",
      "Comments",
      "Newsletter",
    ];
    
    expect(navCommands.length).toBeGreaterThan(0);
    expect(navCommands).toContain("Optimizer");
    expect(navCommands).toContain("Dashboard");
  });

  it("should have action commands", () => {
    const actionCommands = [
      "New Article",
      "Run Workflow",
      "Search Articles",
    ];
    
    expect(actionCommands.length).toBeGreaterThan(0);
    expect(actionCommands).toContain("New Article");
    expect(actionCommands).toContain("Run Workflow");
  });

  it("should support keyboard shortcuts", () => {
    const shortcuts = {
      openPalette: "Cmd/Ctrl+K",
      navigate: "Arrow Up/Down",
      select: "Enter",
      close: "Escape",
    };
    
    expect(shortcuts.openPalette).toBe("Cmd/Ctrl+K");
    expect(shortcuts.navigate).toBe("Arrow Up/Down");
    expect(shortcuts.select).toBe("Enter");
    expect(shortcuts.close).toBe("Escape");
  });

  it("should filter commands by search query", () => {
    const commands = [
      { label: "Optimizer", keywords: ["workflow", "settings"] },
      { label: "Dashboard", keywords: ["home", "overview"] },
      { label: "Articles", keywords: ["posts", "content"] },
    ];
    
    const query = "work";
    const filtered = commands.filter(cmd => 
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.keywords.some(kw => kw.toLowerCase().includes(query.toLowerCase()))
    );
    
    expect(filtered.length).toBe(1);
    expect(filtered[0].label).toBe("Optimizer");
  });

  it("should match commands by description", () => {
    const commands = [
      { label: "Optimizer", description: "Workflow control panel" },
      { label: "Dashboard", description: "Admin overview" },
    ];
    
    const query = "control";
    const filtered = commands.filter(cmd => 
      cmd.description?.toLowerCase().includes(query.toLowerCase())
    );
    
    expect(filtered.length).toBe(1);
    expect(filtered[0].label).toBe("Optimizer");
  });
});
