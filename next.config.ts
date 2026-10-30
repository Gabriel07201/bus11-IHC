import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const allowedDevOrigins = new Set(["127.0.0.1"]);

// The LAN dev server needs to trust only private IPv4 addresses assigned to this machine.
for (const interfaces of Object.values(networkInterfaces())) {
  for (const networkInterface of interfaces ?? []) {
    if (networkInterface.internal || networkInterface.family !== "IPv4") continue;

    const [first, second] = networkInterface.address.split(".").map(Number);
    if (first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)) {
      allowedDevOrigins.add(networkInterface.address);
    }
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: [...allowedDevOrigins],
};

export default nextConfig;
