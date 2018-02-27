import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { FileSizePipe } from '../pipes/file-size.pipe';
import { FileUploadService } from '../services/file-upload.service';
import { FileUploadComponent } from './file-upload.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  declarations: [FileUploadComponent, FileSizePipe],
  exports: [FileUploadComponent],
  providers: [FileUploadService]
})
export class FileUploadModule { }
