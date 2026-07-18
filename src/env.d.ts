/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly APP_PASSWORD?: string;
  readonly SESSION_SECRET?: string;
  readonly CLOUDFLARE_R2_ENDPOINT?: string;
}

interface ImportMeta { readonly env: ImportMetaEnv; }
