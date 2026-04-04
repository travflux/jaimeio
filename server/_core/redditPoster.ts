/**
 * Reddit Poster - Node.js wrapper for Python PRAW script
 * Allows posting articles to Reddit from the workflow
 */

import { spawn } from "child_process";
import * as path from "path";

export interface RedditPostOptions {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  subreddit: string;
  title: string;
  url?: string;
  selftext?: string;
  userAgent?: string;
}

export interface RedditPostResult {
  success: boolean;
  postUrl?: string;
  postId?: string;
  error?: string;
}

/**
 * Post to Reddit using PRAW Python script
 */
export async function postToReddit(options: RedditPostOptions): Promise<RedditPostResult> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "../reddit-poster.py");
    
    // Spawn Python process
    const python = spawn("python3", [scriptPath]);
    
    let stdout = "";
    let stderr = "";
    
    // Collect stdout
    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    // Collect stderr
    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    // Handle process completion
    python.on("close", (code) => {
      try {
        // Parse JSON result from stdout
        const result: RedditPostResult = JSON.parse(stdout.trim());
        resolve(result);
      } catch (err) {
        // If JSON parsing fails, return error
        resolve({
          success: false,
          error: stderr || stdout || "Failed to parse Reddit poster response"
        });
      }
    });
    
    // Handle process error
    python.on("error", (err) => {
      resolve({
        success: false,
        error: `Failed to spawn Python process: ${err.message}`
      });
    });
    
    // Send input data as JSON to stdin
    const inputData = {
      client_id: options.clientId,
      client_secret: options.clientSecret,
      username: options.username,
      password: options.password,
      subreddit: options.subreddit,
      title: options.title,
      url: options.url,
      selftext: options.selftext,
      user_agent: options.userAgent || `${process.env.VITE_APP_TITLE || "ContentEngineBot"}/1.0 (News Poster)`
    };
    
    python.stdin.write(JSON.stringify(inputData));
    python.stdin.end();
  });
}

/**
 * Test Reddit credentials
 */
export async function testRedditConnection(
  clientId: string,
  clientSecret: string,
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to post to r/test (a subreddit specifically for testing bots)
    const result = await postToReddit({
      clientId,
      clientSecret,
      username,
      password,
      subreddit: "test",
      title: "Test post from JAIME.IO Engine - please ignore",
      selftext: "This is an automated test post. Please ignore."
    });
    
    return {
      success: result.success,
      error: result.error
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Unknown error"
    };
  }
}
