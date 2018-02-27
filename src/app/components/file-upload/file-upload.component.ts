import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpResponse, HttpEventType } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import { filter, map, tap, take, toArray, mergeMap, combineAll, concat } from 'rxjs/operators';
import 'rxjs/add/observable/forkJoin';

import { FileUploadService } from '../services/file-upload.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit {

  form: FormGroup;
  loading: boolean;
  @ViewChild('fileInput') fileInput: ElementRef;
  file: File;
  name: string;
  size: number;
  chunkSize: number;
  id: string;
  chunks: Array<Object>;
  isUploaded: boolean;

  constructor(
    private fb: FormBuilder,
    private fileUploadService: FileUploadService
  ) { }

  ngOnInit() {
    this.loading = false;
    this.file = null;
    this.isUploaded = false;
    this.createForm();
  }

  createForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      fileToUpload: null
    });
  }

  onFileChange(event): void {
    this.loading = true;
    if (event.target.files.length === 0) {
      return;
    }
    this.file = event.target.files[0];
    this.name = this.form.value.name || this.file.name;
    this.size = this.file.size;

    const askForUpload = this.fileUploadService.askForUpload(this.name);
    this.chunks = this.fileUploadService.getChunks(this.file);
    const array = [];
    const sendChunks = askForUpload.map(id => {
      this.id = id;
      this.chunks.forEach(chunk => {
        array.push(this.fileUploadService.sendChunk(chunk, id).subscribe(result => {
          if (result.type === HttpEventType.UploadProgress) {
            const percentDone = Math.round(100 * result.loaded / result.total);
            this.chunks[chunk['chunk']]['status'] = result.loaded;
          } else if (result instanceof HttpResponse) {
            this.chunks[chunk['chunk']]['done'] = true;
          }
        }));
      });
    });
    const validate = this.fileUploadService.validateUpload(this.chunks.length);

    sendChunks.pipe(concat(validate)).subscribe((data: boolean) => {
      this.isUploaded = data;
    });
  }

  clearFile() {
    this.form.get('avatar').setValue(null);
    this.fileInput.nativeElement.value = '';
  }

}
