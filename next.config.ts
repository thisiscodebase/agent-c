import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  experimental: {
    // TS 7 has no JS compiler API; use project-local `tsc` instead.
    useTypeScriptCli: true,
  },
};

export default withEve(nextConfig);
