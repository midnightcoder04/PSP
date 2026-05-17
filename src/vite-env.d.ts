/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  /**
   * Browser-safe Supabase API key (RLS-protected).
   * Prefix: `sb_publishable_…`. Replaces the legacy anon key.
   */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  /**
   * @deprecated Legacy name. Use `VITE_SUPABASE_PUBLISHABLE_KEY`.
   * Read with a deprecation warning during transition.
   */
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_DEV_BYPASS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
