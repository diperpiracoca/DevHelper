import { Component, inject } from '@angular/core';
import { CardBase } from "../../../shared/components/card-base/card-base";
import { CardButton } from "../../../shared/components/card-button/card-button";
import { NasaPicture } from "../nasa-picture/nasa-picture";
import { Authenticator } from '../../../shared/service/authenticator';
import { PasswordList } from "../password-list/password-list";

@Component({
  selector: 'app-home',
  imports: [CardBase, CardButton, NasaPicture, PasswordList],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export default class Home {
  private _authenticator = inject(Authenticator);
  logout(){
    this._authenticator.logout();
  }
}
