import { Component, contentChildren, inject, Injector, input } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { ErrorMessage } from './error-message';

@Component({
  template: ''
})
export class InputBase<T = string> implements ControlValueAccessor {

  private _ngControl: NgControl | null = null;
  private _injector = inject(Injector);

  errorMessages = contentChildren(ErrorMessage);

  inputId = input.required<string>();


  value: T | null = null;
  isDisabled = false;

  ngOnInit() {
    this._ngControl = this._injector.get(NgControl, null);
  }

  private onChange: (value: T) => void = () => { };
  private onTouched: () => void = () => { };

  writeValue(value: T | null): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.value as T;
    this.onChange(this.value);
  }

  handleBlur() {
    this.onTouched();
  }

  get control() {
    return this._ngControl?.control;
  }

  get errors() {
    return this.control?.errors;
  }

  get isInvalid(): boolean {
    return !!(this.control?.invalid && (this.control?.touched || this.control?.dirty));
  }

}