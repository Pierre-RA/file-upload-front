import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpEvent, HttpEventType } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';

@Injectable()
export class FileUploadService {

  chunkSize = 25000000;
  url = 'http://localhost:3000';

  constructor(
    private http: HttpClient
  ) { }

  askForUpload(fileName: string): Observable<string> {
    return this.http.get(this.url + '/ask-upload?q=' + fileName).map(data => data['id']);
  }

  getChunks(file: File): Array<Object> {
    const array = [];
    let start = 0;
    let end = this.chunkSize;
    for (let i = 0; i < file.size / this.chunkSize; i++) {
      start = i * this.chunkSize;
      end = start + this.chunkSize > file.size ? file.size : start + this.chunkSize;
      array.push({
        chunk: i,
        blob: file.slice(start, end + 1, 'application/octet-binary'),
        status: ''
      });
    }
    return array;
  }

  /**
   * sendChunk(chunk): Observable<any>
   */
  sendChunk(chunk: Object, id: string): Observable<any> {
    const formData: FormData = new FormData();
    formData.append(id + '_' + chunk['chunk'], chunk['blob']);
    formData.append('id', id);
    formData.append('position', chunk['chunk']);
    const req = new HttpRequest('POST', this.url + '/send-chunk', formData, {
      reportProgress: true
    });

    return this.http.request(req);
  }

  validateUpload(chunks: number): Observable<boolean> {
    return this.http.post(this.url + '/validate-upload', {
      chunks: chunks
    }).map(data => data['message']);
  }

}
