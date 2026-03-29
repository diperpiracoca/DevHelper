import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { NasaPictureInfo } from '../domain/nasa-picture.interface';

@Injectable({
  providedIn: 'root',
})
export class NasaPictureResource {

  getPicture() {
    return httpResource<NasaPictureInfo>(
      () => 'https://api.nasa.gov/planetary/apod?api_key=' + environment.nasaApiKey + '&thumbs=true');
  }

}
