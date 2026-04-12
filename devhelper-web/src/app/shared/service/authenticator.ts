import { computed, inject, Injectable, Injector, runInInjectionContext, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth, authState, browserLocalPersistence, createUserWithEmailAndPassword, GoogleAuthProvider, setPersistence, signInWithEmailAndPassword, signInWithPopup, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Authenticator {

  private _auth = inject(Auth);
  private _injector = inject(Injector);
  private _router = inject(Router);
  readonly initialized = signal(false);
  readonly user = toSignal(this.$userObservable(), { initialValue: null });
  readonly isLoggedIn = computed(() => !!this.user());


  $userObservable(): Observable<User | null> {
    return runInInjectionContext(this._injector, () => authState(this._auth));
  }

  userPromise(): Promise<User | null> {
    return firstValueFrom(this.$userObservable());
  }

  register(email: string, password: string) {
    createUserWithEmailAndPassword(this._auth, email, password).then((userCredential) => {
      this._router.navigate(['/']);
    })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
      });
  }

  async login(email: string, password: string) {
    const result = await signInWithEmailAndPassword(this._auth, email, password);
    this._router.navigate(['/']);
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();

    try {
      await setPersistence(this._auth, browserLocalPersistence);
      const result = await signInWithPopup(this._auth, provider);
      this._router.navigate(['/']);
    } catch (error: any) {
      const errorCode = error.code;
      const errorMessage = error.message;
      const email = error.customData?.email;
      const credential = GoogleAuthProvider.credentialFromError(error);
      console.error('Error Google Login', { errorCode, errorMessage, email, credential });
    }
  }

  async logout() {
    const v = await this._auth.signOut();
    return await this._router.navigate(['/login']);
  }
}