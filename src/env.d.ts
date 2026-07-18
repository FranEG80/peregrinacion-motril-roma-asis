/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly APP_PASSWORD?: string;
  readonly SESSION_SECRET?: string;
  readonly CLOUDFLARE_R2_ENDPOINT?: string;
  readonly MEDIA_TICKET_SECRET?: string;
  readonly MEDIA_WORKER_URL?: string;
}

interface ImportMeta { readonly env: ImportMetaEnv; }
