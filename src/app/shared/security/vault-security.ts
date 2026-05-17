import { computed, DestroyRef, effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { VaultRepository } from './services/vault.repository';
import { MasterKey } from './services/master-key';
import { UnlockKeyWithPin } from './services/unlock-key-with-pin';
import { UnlockKeyWithPasskey } from './services/unlock-key-with-passkey';
import { UnlockKeyI } from './models/unlock-key.model';
import { firstValueFrom } from 'rxjs';
import { VAULT_ERRORS, VAULT_STATUS } from './models/vault.model';


@Injectable({
  providedIn: 'root',
})
export class VaultSecurity {

  private _auth = inject(Auth);
  private _repository = inject(VaultRepository);
  private _masterKey = inject(MasterKey);
  private _unlockWithPin = inject(UnlockKeyWithPin);
  private _unlockWithPasskey = inject(UnlockKeyWithPasskey);
  private _destroyRef = inject(DestroyRef);
  private _vaultKey: WritableSignal<CryptoKey | undefined> = signal(undefined);
  private readonly MAX_PIN_ATTEMPTS = 3;
  private readonly PIN_LOCKOUT_DURATION_MS = 5 * 60 * 1000;
  private _pinAttempts = 0;
  private _pinLockUntil: number | null = null;
  private _countdownIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly pinLockoutRemainingMs = signal(0);

  readonly isSecureModalOpen = signal(false);
  readonly isUnlockModalOpen = signal(false);
  private _pendingAction = signal<(() => void) | null>(null);

  readonly repositoryStatus = this._repository.status;

  readonly vaultStatus = computed<VAULT_STATUS>(() => {
    const repoStatus = this._repository.status();
    if (repoStatus !== VAULT_STATUS.ENCRYPTED) {
      return repoStatus;
    }
    return this._vaultKey() ? VAULT_STATUS.DESENCRYPTED : VAULT_STATUS.ENCRYPTED;
  });

  readonly haveUnlockKeyWithPin = computed(() => {
    const unlock = this._repository.unlockKeyWithPin();
    return unlock != undefined
  });

  readonly haveUnlockKeyWithPasskey = computed(() => {
    const unlock = this._repository.unlockKeyWithPasskey();
    return unlock != undefined
  });

  readonly isWebAuthnSupported = signal(false);

  constructor() {
    this._checkWebAuthnSupport();
  }

  private async _checkWebAuthnSupport() {
    if (!window.PublicKeyCredential) return;
    try {
      const supported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      this.isWebAuthnSupported.set(supported);
    } catch {
      // mantiene false
    }
  }

  readonly isUnlocked = computed(() => {
    return this._vaultKey() !== undefined;
  });

  getVaultKey(): CryptoKey | undefined {
    return this._vaultKey();
  }

  readonly pinAttemptsRemaining = computed(() => {
    if (this._isPinLocked()) return 0;
    return this.MAX_PIN_ATTEMPTS - this._pinAttempts;
  });

  readonly isPinLockedOut = computed(() => this._isPinLocked());

  private statusChanges = effect(() => {
    const s = this._repository.status();
    if (s === VAULT_STATUS.NO_CREATE) {
      this.openSetupVaultModal();
    }
  });

  private _executePendingOnUnlock = effect(() => {
    if (this.vaultStatus() === VAULT_STATUS.DESENCRYPTED && this._pendingAction()) {
      this.isUnlockModalOpen.set(false);
      const action = this._pendingAction()!;
      this._pendingAction.set(null);
      action();
    }
  });

  private _clearPendingOnCancel = effect(() => {
    if (!this.isUnlockModalOpen() && this.vaultStatus() === VAULT_STATUS.ENCRYPTED) {
      this._pendingAction.set(null);
    }
  });

  private lockoutCountdown = effect(() => {
    const locked = this.isPinLockedOut();
    if (locked && !this._countdownIntervalId) {
      this._tickCountdown();
      this._countdownIntervalId = setInterval(() => this._tickCountdown(), 1000);
      this._destroyRef.onDestroy(() => {
        if (this._countdownIntervalId) {
          clearInterval(this._countdownIntervalId);
        }
      });
    } else if (!locked && this._countdownIntervalId) {
      clearInterval(this._countdownIntervalId);
      this._countdownIntervalId = null;
      this.pinLockoutRemainingMs.set(0);
    }
  });

  private _tickCountdown() {
    const remaining = this._pinLockUntil ? Math.max(0, this._pinLockUntil - Date.now()) : 0;
    this.pinLockoutRemainingMs.set(remaining);
    if (remaining <= 0 && this._countdownIntervalId) {
      clearInterval(this._countdownIntervalId);
      this._countdownIntervalId = null;
    }
  }

  private _isPinLocked(): boolean {
    if (this._pinLockUntil === null) return false;
    if (Date.now() > this._pinLockUntil) {
      this._pinLockUntil = null;
      this._pinAttempts = 0;
      return false;
    }
    return true;
  }

  private _recordPinAttempt(success: boolean) {
    if (success) {
      this._pinAttempts = 0;
      this._pinLockUntil = null;
      return;
    }
    this._pinAttempts++;
    if (this._pinAttempts >= this.MAX_PIN_ATTEMPTS) {
      this._pinLockUntil = Date.now() + this.PIN_LOCKOUT_DURATION_MS;
    }
  }

  async createVault(type: 'pin' | 'passkey', pin?: string) {
    let unlockKey: UnlockKeyI | undefined = undefined;
    try {
      const user = this._auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const masterKey = await this._masterKey.generateMasterKey();
      const masterKeyBuffer = await this._masterKey.exportMasterKey(masterKey);
      if (type === 'pin' && pin) {
        unlockKey = await this._unlockWithPin.createUnlockKey(pin, masterKeyBuffer);
      } else if (type === 'passkey') {
        const attestation = await this._unlockWithPasskey.registerPasskeyAttestation(
          user.uid,
          user.email || undefined,
          user.displayName || undefined
        );
        unlockKey = await this._unlockWithPasskey.createUnlockKeyWithPasskey(attestation, masterKeyBuffer);
      }
      if (!unlockKey) {
        throw new Error(VAULT_ERRORS.CREATE_UNLOCK_WITH_PIN)
      }
      const saveUnlockKey = await firstValueFrom(this._repository.addDoc(unlockKey));
      this._repository.unlockList.reload();

      this._vaultKey.set(masterKey);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async createVaultWithPasskey() {
    return this.createVault('passkey');
  }

  async unlockWithPin(pin: string): Promise<boolean> {
    try {
      if (this._isPinLocked()) {
        throw new Error(VAULT_ERRORS.TOO_MANY_ATTEMPTS);
      }

      const unlockKey = this._repository.unlockKeyWithPin();
      if (!unlockKey) {
        throw new Error(VAULT_ERRORS.NOT_EXIST_UNLOCK_WITH_PIN);
      }

      const rawMasterKey = await this._unlockWithPin.unlockMasterKey(pin, unlockKey);
      this._vaultKey.set(await this._masterKey.importMasterKey(rawMasterKey));
      this._recordPinAttempt(true);
      return true;
    } catch (error) {
      this._recordPinAttempt(false);
      throw error;
    }
  }

  async unlockWithPasskey(): Promise<boolean> {
    try {
      const unlockKey = this._repository.unlockKeyWithPasskey();
      if (!unlockKey) {
        throw new Error(VAULT_ERRORS.PASSKEY_UNLOCK_FAILED);
      }

      const assertion = await this._unlockWithPasskey.requestAssertion();
      const rawMasterKey = await this._unlockWithPasskey.unlockMasterKeyWithPasskey(assertion, unlockKey);
      this._vaultKey.set(await this._masterKey.importMasterKey(rawMasterKey));
      return true;
    } catch (error: any) {
      throw error;
    }
  }

  lockVault() {
    this._vaultKey.set(undefined);
  }

  showModal(action?: () => void) {
    const s = this.vaultStatus();
    if (s === VAULT_STATUS.NO_CREATE) {
      this.isSecureModalOpen.set(true);
      return;
    }
    if (s === VAULT_STATUS.ENCRYPTED) {
      this._pendingAction.set(action ?? null);
      this.isUnlockModalOpen.set(true);
    } else if (action) {
      action();
    }
  }

  openSetupVaultModal() {
    this.isSecureModalOpen.set(true);
  }

  openUnlockVaultModal() {
    this.isUnlockModalOpen.set(true);
  }

  async changePin(oldPin: string, newPin: string): Promise<boolean> {
    try {
      if (this._isPinLocked()) {
        throw new Error(VAULT_ERRORS.TOO_MANY_ATTEMPTS);
      }

      const currentUnlockKey = this._repository.unlockKeyWithPin();

      if (!currentUnlockKey) {
        throw new Error(VAULT_ERRORS.NOT_EXIST_UNLOCK_WITH_PIN);
      }

      const updatedUnlockKey = await this._unlockWithPin.changePin(
        oldPin,
        newPin,
        currentUnlockKey
      );

      await firstValueFrom(
        this._repository.setDoc(currentUnlockKey.id, updatedUnlockKey)
      );

      this._repository.unlockList.reload();
      this._recordPinAttempt(true);
      return true;
    } catch (error) {
      this._recordPinAttempt(false);
      console.error(error);
      return false;
    }
  }

}
