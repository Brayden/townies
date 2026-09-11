declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    TOWNS?: DurableObjectNamespace<import("../server/towns/Town").Town>;
    RESIDENTS?: DurableObjectNamespace<import("../server/towns/ResidentCoordinator").ResidentCoordinator>;
    TOWNIES_AUTH_MODE?: string;
    TOWNIES_MAINTENANCE?: string;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
  }
}
