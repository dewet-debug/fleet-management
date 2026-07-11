/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Railway API base (including /api/v1), set on Vercel. Unset in dev. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
