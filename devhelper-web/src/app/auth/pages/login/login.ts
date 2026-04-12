import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Authenticator } from '../../../shared/service/authenticator';

@Component({
  selector: 'app-login',
  imports: [RouterOutlet],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class Login {
  private _authenticator = inject(Authenticator);

  loginWithGoogle() {
    this._authenticator.loginWithGoogle();
  }

}