import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { VaultSecurity } from '../../vault-security';
import { UiModal } from '../../../components/ui-modal/ui-modal';
import { UiPinInput } from '../../../forms/components/input-pin/input-pin';
import { UiButton } from '../../../components/ui-button/button';
import { UiAlert } from '../../../components/ui-alert/ui-alert';

@Component({
  selector: 'secure-unlock-vault',
  imports: [ReactiveFormsModule, FormsModule, UiModal, UiPinInput, UiButton, UiAlert],
  templateUrl: './modal-unlock-vault.html',
  styleUrl: './modal-unlock-vault.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalUnlockVault {
  private _vault = inject(VaultSecurity);
  private _fb = inject(FormBuilder).nonNullable;
  private _autoSubmitted = false;

  protected checked = signal<'PASSKEY' | 'PIN'>('PASSKEY');
  protected isLoading = signal(false);
  protected errorMessage = signal<string | undefined>(undefined);

  protected readonly havePin = this._vault.haveUnlockKeyWithPin;
  protected readonly havePasskey = this._vault.haveUnlockKeyWithPasskey;
  protected readonly attemptsRemaining = this._vault.pinAttemptsRemaining;
  protected readonly isLockedOut = this._vault.isPinLockedOut;
  protected readonly countdownMs = this._vault.pinLockoutRemainingMs;
  protected readonly isOpen = this._vault.isUnlockModalOpen;

  protected readonly onlyPin = computed(() => this.havePin() && !this.havePasskey());
  protected readonly onlyPasskey = computed(() => this.havePasskey() && !this.havePin());
  protected readonly bothAvailable = computed(() => this.havePin() && this.havePasskey());

  protected readonly countdown = computed(() => {
    const ms = this.countdownMs();
    if (ms <= 0) return '';
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  });

  private _statusEffect = effect(() => {
    const status = this._vault.vaultStatus();
    if (status !== 'ENCRYPTED' && this.isOpen()) {
      this.isOpen.set(false);
    }
  });

  constructor() {
    this._setupAutoSubmit();
  }

  private _setupAutoSubmit() {
    this._unlockForm.controls.pin.valueChanges.subscribe(val => {
      if (!this._autoSubmitted && val.length === 5 && !this.isLockedOut()) {
        this._autoSubmitted = true;
        this.submitPin();
      }
    });
  }

  protected switchToPin() {
    this.checked.set('PIN');
    this.errorMessage.set(undefined);
  }

  protected reset() {
    this._unlockForm.controls.pin.reset();
    this.errorMessage.set(undefined);
    this.isLoading.set(false);
    this._autoSubmitted = false;
  }

  protected async submitPin() {
    if (this._unlockForm.invalid || this.isLoading() || this.isLockedOut()) return;
    this.isLoading.set(true);
    this.errorMessage.set(undefined);
    try {
      await this._vault.unlockWithPin(this._unlockForm.controls.pin.value);
    } catch (error: any) {
      this.errorMessage.set(error.message);
      this._unlockForm.controls.pin.reset();
      this._autoSubmitted = false;
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async unlockWithPasskey() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(undefined);
    try {
      await this._vault.unlockWithPasskey();
    } catch (error: any) {
      this.errorMessage.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected _unlockForm = this._fb.group({
    pin: this._fb.control<string>('', [Validators.required, Validators.pattern(/^\d{5}$/)]),
  });
}
