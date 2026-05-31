// Single source of truth for the app version shown in the UI (sidebar footer).
// Kept in sync with package.json "version" at release time. Importing the JSON
// directly keeps this honest without a build step.
import pkg from "../../package.json";

export const APP_VERSION = pkg.version;
export const APP_VERSION_LABEL = `v${pkg.version}`;
