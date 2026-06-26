import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ffmpeg-installer/ffmpeg does a dynamic `require()` at runtime to pick the
  // right platform subpackage (darwin-arm64, linux-x64, …). Turbopack can't
  // statically resolve that, so we tell Next to leave it alone and load it
  // from node_modules at runtime instead of trying to bundle it.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "@ffprobe-installer/ffprobe"],
};

export default nextConfig;
