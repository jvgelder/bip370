export interface ValidationErrorEntry {
  readonly field: string;
  readonly value: string;
  readonly reason: string;
}

export class ValidationErrorContainer extends Error {
  readonly _errors: ValidationErrorEntry[] = [];

  constructor(message?: string) {
    super(message ?? 'Validation failed');
    this.name = 'ValidationErrorContainer';
  }

  get errors(): readonly ValidationErrorEntry[] {
    return this._errors;
  }

  addError(error: ValidationErrorEntry): void {
    this._errors.push(error);
    this.message = this._errors.map(e => `${e.field}: ${e.reason}`).join('; ');
  }

  addErrors(errors: readonly ValidationErrorEntry[]): void {
    this._errors.push(...errors);
    this.message = this._errors.map(e => `${e.field}: ${e.reason}`).join('; ');
  }
}
