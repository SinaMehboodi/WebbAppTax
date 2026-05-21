// Backwards-compatible alias: the real signup lives at /api/auth/signup. We
// re-export the POST handler so both URLs work and the original scaffold
// continues to function while new code uses the namespaced path.
export { POST } from "../auth/signup/route";
