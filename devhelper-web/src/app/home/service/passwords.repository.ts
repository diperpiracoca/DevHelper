import { Injectable } from '@angular/core';
import { PasswordI } from '../domain/password.interface';
import { FirestoreDataConverter } from '@angular/fire/firestore';
import { BaseRepository } from '../../shared/service/repository-base';

@Injectable({
  providedIn: 'root',
})
export class PasswordRepository extends BaseRepository<PasswordI> {

  protected override path: [string, ...string[]] = ['passwords'];

  protected override converter: FirestoreDataConverter<PasswordI> = {
    toFirestore: (data: PasswordI) => data,
    fromFirestore: (snap) => snap.data() as PasswordI
  };

}
