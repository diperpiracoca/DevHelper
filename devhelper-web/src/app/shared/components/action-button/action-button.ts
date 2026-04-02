import { Component, input } from '@angular/core';

@Component({
  selector: 'sh-action-button',
  imports: [],
  templateUrl: './action-button.html',
  styleUrl: './action-button.css',
})
export class ActionButton {
  icon = input<string>();
  styleClass = input<string>();
  iconClass = input<string>();
  type = input<'circle' | 'square'>('square');
  size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md')
  severity = input<'primary' | 'secundary' | 'light'>('primary');
}
