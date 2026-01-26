import { Injectable } from '@angular/core';
import { VERSION } from '../version';

@Injectable({
  providedIn: 'root',
})
export class VersionService {
  getVersion(): string {
    return VERSION;
  }
}
