import { inject, Injectable, Injector, resource, runInInjectionContext } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { addDoc, collection, collectionData, deleteDoc, doc, docData, updateDoc, Firestore, FirestoreDataConverter, setDoc, DocumentData, CollectionReference } from '@angular/fire/firestore';
import { Observable } from 'rxjs/internal/Observable';
import { Authenticator } from '../../auth/services/authenticator';
import { from } from 'rxjs/internal/observable/from';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { map } from 'rxjs/internal/operators/map';
import { filter } from 'rxjs/internal/operators/filter';
import { User } from '@angular/fire/auth';
import { of } from 'rxjs/internal/observable/of';
import { EMPTY } from 'rxjs/internal/observable/empty';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';

@Injectable({
  providedIn: 'root',
})
export abstract class BaseRepository<T extends { id?: string }> {

  protected _firestore = inject(Firestore);
  protected _auth = inject(Authenticator);
  protected _injector = inject(Injector);

  protected abstract path: [string, ...string[]];
  protected abstract converter: FirestoreDataConverter<T>;
  protected _user = this._auth.user;
  protected colRefSignal = toSignal(this.$userCollectionRef(), { initialValue: undefined });



  $userCollectionRef() {
    return this._auth.$userObservable().pipe(
      filter((u): u is User => !!u),
      map(u => {
        if (u) {
          return runInInjectionContext(this._injector, () =>
            collection(
              this._firestore,
              'users',
              u.uid,
              ...this.path
            ).withConverter(this.converter));
        }
        return undefined;
      }));
  }

  getAllSignal() {
    return toSignal(
      this.$userCollectionRef().pipe(
        switchMap(ref => {
          if (!ref) return of([]);
          return runInInjectionContext(this._injector, () =>
            collectionData(ref, { idField: 'id' }) as Observable<(T & { id: string })[]>
          );
        })),
      { initialValue: [], injector: this._injector }
    );
  }


  getAllResource() {
    return resource({
      loader: async () => {
        const ref = await firstValueFrom(
          this.$userCollectionRef().pipe(
            filter((r): r is CollectionReference<T> => !!r)
          )
        );

        if (!ref) return [];

        return runInInjectionContext(this._injector, async () => {
          const data = await firstValueFrom(
            collectionData(ref, { idField: 'id' })
          );
          return data as (T & { id: string })[];
        });
      }
    });
  }

  getById(id: string) {
    return toSignal(
      this.$userCollectionRef().pipe(
        switchMap(ref => {
          if (!ref) return of(undefined);
          const docRef = doc(ref, id);
          return runInInjectionContext(this._injector, () =>
            docData(docRef) as Observable<T & { id: string }>
          );
        })),
      { initialValue: undefined, injector: this._injector }
    );
  }

  delete(id: string) {
    return this.$userCollectionRef().pipe(
      switchMap(ref => {
        if (!ref) return EMPTY;
        const docRef = doc(ref, id);
        return runInInjectionContext(this._injector, () =>
          from(deleteDoc(docRef))
        );
      })
    );
  }

  create(item: T) {
    return this.$userCollectionRef().pipe(
      switchMap(ref => {
        if (!ref) return EMPTY;

        return runInInjectionContext(this._injector, () =>
          from(addDoc(ref, item)).pipe(
            map(docRef => ({
              id: docRef.id,
              ...item
            }))
          )
        );
      })
    );
  }

  update(id: string, data: Partial<T>) {
    return this.$userCollectionRef().pipe(
      switchMap(ref => {
        if (!ref) return EMPTY;
        const _ref = doc(ref, id);
        const _data: DocumentData = { ...data };
        const docRef = doc(_ref, id);
        return runInInjectionContext(this._injector, () =>
          from(updateDoc(docRef, _data))
        );
      })
    );
  }

  set(id: string, data: Partial<T>) {
    return this.$userCollectionRef().pipe(
      switchMap(ref => {
        if (!ref) return EMPTY;

        const docRef = doc(ref, id);

        return runInInjectionContext(this._injector, () =>
          from(setDoc(docRef, data, { merge: true }))
        );
      })
    );
  }

}