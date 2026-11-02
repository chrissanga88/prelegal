import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Statically exported to `out/` and served by the FastAPI backend.
  output: "export",
  // Emit `draft/index.html` so the backend's static file server can resolve `/draft/`.
  trailingSlash: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
