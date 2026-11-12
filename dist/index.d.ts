import { type Endpoint } from "./endpoints.js";
/** Finds the documented endpoint a concrete path belongs to; rejects anything not in the spec. */
export declare function matchEndpoint(method: string, path: string): Endpoint;
declare const _default: import("openclaw/plugin-sdk/tool-plugin").DefinedToolPluginEntry;
export default _default;
