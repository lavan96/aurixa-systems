/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRICING_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
