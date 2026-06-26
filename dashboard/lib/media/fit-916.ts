import "server-only";

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

/** Reel canvas — keep in sync with assemble.ts W/H. */
export const REEL_W = 720;
export const REEL_H = 1280;

/**
 * Force any image to exact 9:16 (720×1280). Center-crops to fill — no
 * letterboxing — so Kling inherits a true vertical frame, not a square with
 * black bars baked in later.
 */
export async function fitTo916(
  bytes: Buffer,
  mimeType: string,
): Promise<{ bytes: Buffer; mimeType: string }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "fit916-"));
  try {
    const inExt = /jpe?g/i.test(mimeType) ? "jpg" : "png";
    const inPath = path.join(tmpDir, `in.${inExt}`);
    const outPath = path.join(tmpDir, "out.png");
    await fs.writeFile(inPath, bytes);
    await runFfmpeg([
      "-y",
      "-i",
      inPath,
      "-vf",
      `scale=${REEL_W}:${REEL_H}:force_original_aspect_ratio=increase,crop=${REEL_W}:${REEL_H}`,
      "-frames:v",
      "1",
      outPath,
    ]);
    return { bytes: await fs.readFile(outPath), mimeType: "image/png" };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegInstaller.path, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`fit916 ffmpeg exit ${code}: ${stderr.slice(-400)}`));
    });
  });
}
