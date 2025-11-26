import { ParsedOptions } from '../types/algosheet';

export function parseOptions(optionsStr: string | null | undefined): ParsedOptions {
    const defaults: ParsedOptions = {
        web: false,
        sources: false,
        lang: 'en'
    };

    if (!optionsStr) {
        return defaults;
    }

    const result = { ...defaults };
    const pairs = optionsStr.split(';');

    for (const pair of pairs) {
        const [key, value] = pair.split('=').map(s => s.trim());
        if (!key || !value) continue;

        const lowerKey = key.toLowerCase();
        const lowerValue = value.toLowerCase();

        switch (lowerKey) {
            case 'web':
                result.web = lowerValue === 'true' || lowerValue === '1';
                break;
            case 'sources':
                result.sources = lowerValue === 'true' || lowerValue === '1';
                break;
            case 'lang':
                result.lang = lowerValue; // Keep original case for lang code if needed, or lower? Guide says "fr", "en".
                break;
        }
    }

    return result;
}
