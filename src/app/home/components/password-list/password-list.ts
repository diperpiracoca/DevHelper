import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { UiCardButton } from "../../../shared/components/card-button/card-button";
import { UiCard } from "../../../shared/components/card-base/card-base";
import { UiListItem } from '../../../shared/components/item-list/item-list';
import { UiListButton } from "../../../shared/components/list-button/list-button";
import { UiInput } from "../../../shared/forms/components/input-generic/input-generic";
import { PasswordInput } from "../../../auth/components/password-input/password-input";
import { PasswordRepository } from '../../service/passwords.repository';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PasswordI } from '../../domain/password.interface';
import { UiButton } from "../../../shared/components/ui-button/button";
import { ErrorMessage } from '../../../shared/forms/components/input-base/error-message';
import { UiModal } from "../../../shared/components/ui-modal/ui-modal";
import { VaultSecurity } from "../../../shared/security/vault-security";
import { UiAlert } from "../../../shared/components/ui-alert/ui-alert";

@Component({
  selector: 'password-list',
  imports: [UiCardButton, UiCard, UiListItem, UiListButton, UiInput, PasswordInput,
    ReactiveFormsModule, UiButton, ErrorMessage, UiAlert, UiModal],
  templateUrl: './password-list.html',
  styleUrl: './password-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PasswordList {
  private _repo = inject(PasswordRepository);
  private _formBuilder = inject(FormBuilder).nonNullable;
  private _vault = inject(VaultSecurity);

  readonly collection = this._repo.getCollection();

  isFormModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isViewModalOpen = signal(false);

  deleteStatus = signal<{ password?: PasswordI, loanding: boolean }>({ loanding: false });
  addStatus = signal<{ isEdit?: boolean, loanding: boolean }>({ loanding: false });

  viewStatus = signal<{ password?: PasswordI, decrypted: string, loading: boolean, error: string }>({ loading: false, error: '', decrypted: '' });
  editPassword = signal<string | null>(null);

  async openAdd() {
    if (!this._vault.isUnlocked()) {
      this._vault.showModal(() => this.openAdd());
      return;
    }
    this.editPassword.set(null);
    this.addStatus.update(v => { v.isEdit = false; return v; });
    this.isFormModalOpen.set(true);
  }

  async openEdit(item: PasswordI) {
    if (!this._vault.isUnlocked()) {
      this._vault.showModal(() => this.openEdit(item));
      return;
    }
    this.editPassword.set(item.password.cipher.length > 0 ? '****' : '');
    this.addStatus.update(v => { v.isEdit = true; return v; });
    this._form.patchValue({ name: item.name, secure: item.secure });
    this.isFormModalOpen.set(true);
  }

  async viewPassword(item: PasswordI) {
    if (!this._vault.isUnlocked()) {
      this._vault.showModal(() => this.viewPassword(item));
      return;
    }
    const vaultKey = this._vault.getVaultKey()!;
    this.viewStatus.update(v => { v.password = item; v.loading = true; v.error = ''; return v; });
    this.isViewModalOpen.set(true);
    try {
      const decrypted = await this._repo.decryptPassword(item.password, vaultKey);
      this.viewStatus.update(v => { v.decrypted = decrypted; v.loading = false; return v; });
    } catch (err) {
      this.viewStatus.update(v => { v.error = 'Error al desencriptar'; v.loading = false; return v; });
    }
  }

  cancelForm() {
    this.isFormModalOpen.set(false);
    this.addStatus.set({ loanding: false });
    this._form.reset();
    this.editPassword.set(null);
  }

  async add() {
    const f = this._form;
    if (f.invalid) {
      f.markAllAsDirty();
      return;
    }
    const vaultKey = this._vault.getVaultKey();
    if (!vaultKey) {
      this._vault.showModal(() => this.add());
      return;
    }
    const { name, password, secure } = f.value;
    if (!name || !password) return;
    const encryptedPassword = await this._repo.encryptPassword(password, vaultKey);
    this.addStatus.update(v => { v.loanding = true; return v; });
    this._repo.addDoc({ name, password: encryptedPassword, secure: secure ?? false }).subscribe({
      next: () => {
        this.isFormModalOpen.set(false);
        this.collection.reload();
        this._form.reset();
        this.editPassword.set(null);
        this.addStatus.set({ loanding: false });
      },
      error: () => {
        this.addStatus.update(v => { v.loanding = false; return v; });
      },
    });
  }

  questionDelete(item: PasswordI) {
    this.deleteStatus.update((v) => { v.password = item; return v; });
    this.isDeleteModalOpen.set(true);
  }

  delete() {
    const id = this.deleteStatus().password?.id;
    if (!id) return;
    this.deleteStatus.update((v) => { v.loanding = true; return v; });
    this._repo.deleteDoc(id).subscribe({
      next: () => {
        this.isDeleteModalOpen.set(false);
        this.collection.reload();
        this.deleteStatus.set({ loanding: false });
      }
    });
  }

  protected _form = this._formBuilder.group({
    name: this._formBuilder.control<string>('', [Validators.required]),
    password: this._formBuilder.control<string>('', [Validators.required]),
    secure: this._formBuilder.control<boolean>(false),
  });

}