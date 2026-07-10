/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Mission Control base URL — the headless billing engine behind /pricing. */
  readonly VITE_BILLING_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
