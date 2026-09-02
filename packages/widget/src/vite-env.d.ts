/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Discord application Client ID (Developer Portal → OAuth2). */
  readonly VITE_DISCORD_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
