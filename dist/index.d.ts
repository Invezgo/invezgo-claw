import { type Endpoint } from "./endpoints.js";
/** Finds the documented endpoint a concrete path belongs to; rejects anything not in the spec. */
export declare function matchEndpoint(method: string, path: string): Endpoint;
export declare const UNTRUSTED_NOTICE: string;
export declare const untrusted: (data: unknown, note?: string) => {
    untrusted_content: boolean;
    notice: string;
    note?: string | undefined;
    data: unknown;
};
declare const _default: import("openclaw/plugin-sdk/tool-plugin").DefinedToolPluginEntry;
export default _default;
