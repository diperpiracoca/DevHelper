import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmailInput } from '../../components/email-input/email-input';
import { PasswordInput } from '../../components/password-input/password-input';
import { RouterLink } from '@angular/router';
import { Authenticator } from '../../../shared/service/authenticator';

@Component({
  selector: 'app-form-login',
  imports: [ReactiveFormsModule, EmailInput, PasswordInput, RouterLink],
  templateUrl: './form-login.html',
  styleUrl: './form-login.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class FormLogin {
  private _authenticator = inject(Authenticator);
  private _formBuilder = inject(FormBuilder).nonNullable;

  loanding = false;

  form = this._formBuilder.group({
    email: this._formBuilder.control<string>('', [Validators.email, Validators.required]),
    password: this._formBuilder.control<string>('', [Validators.required])
  });

  onSudmit() {
    const f = this.form;
    if (f.invalid) {
      f.markAllAsDirty();
      return
    }
    const value = f.value;
    this.loanding = true;
    this._authenticator.login(value.email!, value.password!)
      .then(v => { })
      .catch(e => {
        this.form.get('email')?.setErrors({ FirebaseError: e.code });
        this.form.get('password')?.setErrors({ FirebaseError: e.code });
        this.form.setErrors({ FirebaseError: e.code });
      })
      .finally(() => this.loanding = false);
  }

}
