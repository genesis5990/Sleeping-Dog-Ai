/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a minimal standalone server bundle for Docker / Fly.io.
  output: "standalone",
  // Next's file tracer prunes `.next/standalone/node_modules` down to what it
  // can statically see from import/require. It cannot see through
  // extract.ts's lazy `await import("pdf-parse")`, and mailparser pulls in
  // its own dynamic requires internally — both packages (plus pdf-parse's
  // native-binary dependency chain, @napi-rs/canvas + pdfjs-dist) were
  // silently dropped from the production image, so every Case Files PDF/.eml
  // upload failed at runtime on Fly.io even though local `npm run build`
  // looked clean. Force-include them so the standalone copy keeps them.
  // NOTE: `outputFileTracingIncludes` is still `experimental` on Next 14.2.x
  // (it moves to the top level in Next 15) — must live under `experimental`
  // here or Next silently rejects the whole key with a config warning.
  experimental: {
    outputFileTracingIncludes: {
      "/api/documents/ingest": [
        "./node_modules/pdf-parse/**",
        "./node_modules/pdfjs-dist/**",
        "./node_modules/@napi-rs/canvas/**",
        "./node_modules/@napi-rs/canvas-linux-x64-gnu/**",
        "./node_modules/@napi-rs/canvas-linux-x64-musl/**",
        "./node_modules/mailparser/**",
      ],
    },
  },
};
export default nextConfig;
