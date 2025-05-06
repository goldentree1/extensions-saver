// gnome.d.ts

// Augment the global scope in the context of GJS only
declare global {
    var Me: any;
    var imports: any;  // GJS-specific global object
    // https://gitlab.gnome.org/GNOME/gjs/-/blob/master/doc/Logging.md
    var print: (...args: any[]) => void;
    var printerr: (...args: any[]) => void;
    var ARGV: string[];
}

declare class TextDecoder {
    constructor(label?: string, options?: { fatal?: boolean, ignoreBOM?: boolean });

    decode(input?: Uint8Array | null, options?: { stream?: boolean }): string;
}


// Ensure this file is treated as a module
export { };