import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpResponse, HttpEventType } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import { filter, map, tap, take, toArray, merge, mergeMap, combineAll, concat, zip } from 'rxjs/operators';
import 'rxjs/add/observable/merge';

import { Chunk, Message, Progress } from '../../shared';
import { FileUploadService } from '../services/file-upload.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit {

  form: FormGroup;
  @ViewChild('fileInput') fileInput: ElementRef;
  file: File;
  name: string;
  size: number;
  completion: Progress;
  progressList: Array<Progress>;

  constructor(
    private fb: FormBuilder,
    private fileUploadService: FileUploadService
  ) { }

  ngOnInit() {
    this.file = null;
    this.createForm();
  }

  createForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      fileToUpload: null
    });
  }

  onFileChange(event): void {
    if (event.target.files.length === 0) {
      return;
    }
    this.file = event.target.files[0];
    this.name = this.form.value.name || this.file.name;
    this.size = this.file.size;
    this.uploadFile();
  }

  uploadFile(): void {
    this.listenProgress();
    this.listenCompletion();
    this.askForUpload().subscribe(data => {
      Observable.merge(...data).subscribe(msg => {
      });
    });
  }

  listenProgress(): void {
    this.progressList = [];
    this.fileUploadService.listenProgress().subscribe(progress => {
      if (progress.status === 'uploaded') {
        this.progressList[progress.position].status = progress.status;
      } else if (progress.status !== 'unknown') {
        this.progressList[progress.position] = progress;
      }
    });
  }

  listenCompletion(): void {
    this.fileUploadService.listenCompletion().subscribe(completion => {
      if (completion.status === 'started') {
        this.completion = completion;
      }
      if (completion.status === 'ended') {
        this.fileUploadService.validateUpload(completion, this.name).subscribe(message => {
          if (message.error) {
            this.completion.status = 'failed';
          } else {
            this.completion.status = 'ended';
          }
          console.log(message.message);
        });
      }
    });
  }

  askForUpload(): Observable<Array<Observable<Chunk>>> {
    return this.fileUploadService.askForUpload(this.name).pipe(
      map(id => this.fileUploadService.getChunks(this.file, id)),
      map(chunks => {
        const pool = [];
        chunks.forEach(chunk => {
          pool.push(this.fileUploadService.sendChunk(chunk));
        });
        return pool;
      }),
    );
  }

}
