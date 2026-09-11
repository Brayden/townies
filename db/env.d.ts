declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    TOWNIES_AUTH_MODE?: string;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
  }
}
