export interface ValidationErrorEntry {
    readonly field: string;
    readonly value: string;
    readonly reason: string;
}
export declare class ValidationErrorContainer extends Error {
    readonly _errors: ValidationErrorEntry[];
    constructor(message?: string);
    get errors(): readonly ValidationErrorEntry[];
    addError(error: ValidationErrorEntry): void;
    addErrors(errors: readonly ValidationErrorEntry[]): void;
}
