/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow loading dev assets (HMR, etc.) when accessing the dev server via
  // a LAN IP or other hostname rather than localhost. List additional hosts
  // here if you test from a phone/tablet on the same network.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    // LAN access — replace or add yours
    "129.187.207.228",
    // Allow any 10.x / 172.16-31.x / 192.168.x private ranges
    "10.*",
    "172.*",
    "192.168.*",
  ],
};

export default nextConfig;
