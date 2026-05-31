/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow loading dev-only assets (HMR socket, error overlay, etc.) when the
  // browser reaches the dev server via a LAN/VPN IP instead of localhost.
  // Next.js 16 blocks cross-origin requests to /_next/* dev resources by
  // default, so an un-listed host gets its HMR websocket 403'd (Fast Refresh
  // silently dies and the terminal logs a "Blocked cross-origin request"
  // warning).
  //
  // GOTCHA: each "*" matches exactly ONE label, so a wildcard must have as
  // many segments as a real IP. "129.187.*" only matches 3-octet hosts and
  // will NOT match 129.187.98.104 — you need the four-segment "129.187.*.*".
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    // University (TUM) — reached over the OpenVPN tunnel, which hands out a
    // 129.187.x.x address that DHCP rotates (was .214, now .104).
    "129.187.*.*",
    // Home / phone / tablet on the same private LAN.
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
  ],
};

export default nextConfig;
