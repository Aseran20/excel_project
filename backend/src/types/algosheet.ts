export interface ParsedOptions {
    web: boolean;
    sources: boolean;
    lang: string;
}

export interface AlgoSheetRequest {
    prompt: string;
    responseMode?: 'free' | 'structured' | null;
    schema?: string | null;
    options?: string | null;
}

export interface AlgoSheetResponse {
    value: string | number | null;
    confidence?: number | null;
    sources?: {
        url: string;
        title?: string | null;
        snippet?: string | null;
    }[];
}

export interface AlgoSheetError {
    error: string;
    details?: any;
}
