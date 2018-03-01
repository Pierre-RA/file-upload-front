import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpEvent, HttpErrorResponse, HttpEventType } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { map, tap, last, catchError, retry } from 'rxjs/operators';
import 'rxjs/add/observable/of';

import { Chunk, Message, Progress, Status } from '../../shared';

@Injectable()
export class FileUploadService {

  chunkSize = 25000000;
  url = 'http://localhost:3000';
  id: string;
  progress: Subject<Progress>;
  completion: Subject<Progress>;
  status: Array<boolean>;

  constructor(
    private http: HttpClient
  ) {
    this.progress = new Subject<Progress>();
    this.completion = new Subject<Progress>();
  }

  /**
   *
   */
  askForUpload(fileName: string): Observable<string> {
    return this.http.get(this.url + '/ask-upload?name=' + fileName).pipe(
      tap(data => this.status = []),
      tap(data => {
        this.completion.next({
          id: data['id'],
          position: null,
          status: Status.Started
        });
      }),
      map(data => data['id'])
    );
  }

  /**
   *
   */
  getChunks(file: File, id: string): Array<Chunk> {
    const array = [];
    let start = 0;
    let end = this.chunkSize;
    for (let i = 0; i < file.size / this.chunkSize; i++) {
      start = i * this.chunkSize;
      end = start + this.chunkSize > file.size ? file.size : start + this.chunkSize;
      array.push({
        id: id,
        position: i,
        blob: file.slice(start, end, 'application/octet-binary'),
      });
      this.status.push(false);
    }
    return array;
  }

  /**
   *
   */
  sendChunk(chunk: Chunk) {
    const formData: FormData = new FormData();
    formData.append('file', chunk.blob);
    formData.append('id', chunk.id);
    formData.append('position', '' + chunk.position);
    const req = new HttpRequest('POST', this.url + '/send-chunk', formData, {
      reportProgress: true
    });

    return this.http.request(req).pipe(
      map(event => this.getEventProgress(event, chunk)),
      tap(progress => this.sendProgress(progress)),
      last(),
      retry(3),
      catchError((error: HttpErrorResponse) => {
        return Observable.of({
          error: true,
          message: 'upload failed'
        });
      })
    );
  }

  /**
   *
   */
  validateUpload(completion: Progress, name: string) {
    return this.http.post<Message>(this.url + '/validate-upload', {
      id: completion.id,
      chunks: completion.position,
      name: name
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        return Observable.of({
          error: true,
          message: error.message
        });
      })
    );
  }

  /**
   *
   */
  getEventProgress(event: HttpEvent<any>, chunk: Chunk): Progress {
    switch (event.type) {
      case HttpEventType.Sent:
        return {
          id: chunk.id,
          position: chunk.position,
          status: Status.Started
        };
      case HttpEventType.UploadProgress:
        return {
          id: chunk.id,
          position: chunk.position,
          status: Status.Running,
          loaded: event.loaded,
          total: event.total
        };
      case HttpEventType.Response:
        return {
          id: chunk.id,
          position: chunk.position,
          status: Status.Ended,
        };
      default:
        return {
          id: chunk.id,
          position: chunk.position,
          status: Status.Unknown,
        };
    }
  }

  /**
   * sendProgress(progress: Progress): void
   */
  sendProgress(progress: Progress) {
    // Upload is done, set status to true
    if (progress.status === Status.Ended) {
      this.status[progress.position] = true;
    }

    // Send progress
    this.progress.next(progress);

    // Check if every upload is done
    if (this.status.reduce((acc, curr) => acc && curr)) {
      this.completion.next({
        id: progress.id,
        position: this.status.length,
        status: Status.Ended
      });
    }
  }


  /**
   * listenProgress(): Observable<Progress>
   * @return progress as Observable
   */
  listenProgress(): Observable<Progress> {
    return this.progress.asObservable();
  }


  /**
   * listenCompletion(): Observable<Progress>
   * @return completion as Observable
   */
  listenCompletion(): Observable<Progress> {
    return this.completion.asObservable();
  }

}
