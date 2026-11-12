export declare const SPEC_VERSION = "1.2";
export declare const ENDPOINTS: Endpoint[];
export type Endpoint = {
    method: string;
    path: string;
    tag: string;
    summary: string;
    description: string;
    params: {
        name: string;
        in: string;
        required: boolean;
        description: string;
        enum?: unknown[];
    }[];
    body?: unknown;
    bodyExample?: unknown;
};
