import { defineManifest } from "@crxjs/vite-plugin";

const TRACKED_MATCHES = [
  "*://*.youtube.com/*",
  "*://youtube.com/*",
  "*://*.x.com/*",
  "*://x.com/*",
  "*://*.twitter.com/*",
  "*://twitter.com/*",
  "*://*.reddit.com/*",
  "*://reddit.com/*",
  "*://*.instagram.com/*",
  "*://instagram.com/*",
  "*://*.tiktok.com/*",
  "*://tiktok.com/*",
  "*://*.facebook.com/*",
  "*://facebook.com/*",
  "*://*.netflix.com/*",
  "*://netflix.com/*",
];

export const manifest = defineManifest({
  manifest_version: 3,
  name: "Cognite",
  version: "0.1.0",
  description: "Reignite your cognition with short, voluntary reading challenges.",
  action: {
    default_popup: "popup.html",
    default_title: "Cognite",
  },
  options_page: "options.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  permissions: ["storage", "tabs", "alarms"],
  host_permissions: [
    "http://127.0.0.1:8000/*",
    "http://localhost:8000/*",
    ...TRACKED_MATCHES,
  ],
  content_scripts: [
    {
      matches: TRACKED_MATCHES,
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  web_accessible_resources: [
    {
      resources: ["intervention.html"],
      matches: TRACKED_MATCHES,
    },
  ],
});
