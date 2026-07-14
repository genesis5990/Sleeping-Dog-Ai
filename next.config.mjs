/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a minimal standalone server bundle for Docker / Fly.io.
  output: "standalone",
  // Next's file tracer prunes `.next/standalone/node_modules` down to what it
  // can statically see from import/require. It cannot see through
  // mailparser's own internal dynamic requires, so it was silently dropped
  // from the production image and every .eml upload failed at runtime on
  // Fly.io even though local `npm run build` looked clean. Force-include it
  // so the standalone copy keeps it.
  // NOTE: `outputFileTracingIncludes` is still `experimental` on Next 14.2.x
  // (it moves to the top level in Next 15) — must live under `experimental`
  // here or Next silently rejects the whole key with a config warning.
  //
  // pdf-parse and @napi-rs/canvas are handled differently below
  // (serverComponentsExternalPackages), not via outputFileTracingIncludes --
  // see that comment for why.
  experimental: {
    outputFileTracingIncludes: {
      "/api/documents/ingest": ["./node_modules/mailparser/**"],
    },
    // Tell webpack to leave pdf-parse and @napi-rs/canvas as real `require()`
    // calls resolved from node_modules at runtime, instead of bundling them
    // into a webpack chunk. Without this, webpack rewrites pdfjs-dist's
    // internal dynamic `import(workerSrc)` into a chunk-relative path
    // (e.g. "/app/.next/server/chunks/pdf.worker.mjs") that never actually
    // gets emitted there, so every PDF upload failed at runtime with:
    // 'Setting up fake worker failed: "Cannot find module
    // '/app/.next/server/chunks/pdf.worker.mjs' imported from
    // .../chunks/774.js"'. This also happens to be pdf-parse's own
    // documented fix for Next.js/serverless deployments:
    // https://github.com/mehmet-kozan/pdf-parse/blob/main/docs/troubleshooting.md
    // (that doc calls the option `serverExternalPackages`, the Next 15 name
    // -- on Next 14.2.x it's still `serverComponentsExternalPackages` under
    // `experimental`, confirmed against this project's installed
    // next/dist/server/config-schema.js).
    serverComponentsExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  },
};
export default nextConfig;
