export class ValidationErrorContainer extends Error {
  constructor(message) {
    super(message ?? 'Validation failed');
    this._errors = [];
    this.name = 'ValidationErrorContainer';
  }
  get errors() {
    return this._errors;
  }
  addError(error) {
    this._errors.push(error);
    this.message = this._errors.map(e => `${e.field}: ${e.reason}`).join('; ');
  }
  addErrors(errors) {
    this._errors.push(...errors);
    this.message = this._errors.map(e => `${e.field}: ${e.reason}`).join('; ');
  }
}
