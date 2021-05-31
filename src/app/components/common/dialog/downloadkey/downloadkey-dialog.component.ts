import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { Component, OnDestroy } from '@angular/core';
import {
  WebSocketService,
  StorageService,
} from '../../../../services';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { EntityUtils } from '../../../../pages/common/entity/utils';
import helptext from '../../../../helptext/storage/volumes/download-key';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'downloadkey-dialog',
  styleUrls: ['./downloadkey-dialog.component.scss'],
  templateUrl: './downloadkey-dialog.component.html',
})
export class DownloadKeyModalDialog implements OnDestroy {
  new = false;
  volumeId: any;
  volumeName: any;
  fileName: any;
  isDownloaded: Boolean = false;
  help = helptext;
  onDestroy$ = new Subject();

  constructor(
    protected translate: TranslateService,
    public dialogRef: MatDialogRef<DownloadKeyModalDialog>,
    private ws: WebSocketService,
    private storage: StorageService,
    private http: HttpClient,
    public dialog: MatDialog,
    private loader: AppLoaderService,
  ) { }

  downloadKey(): void {
    const payload = [this.volumeId];
    if (this.fileName !== undefined) {
      payload.push(this.fileName);
    }
    let mimetype: string;
    this.loader.open();
    if (this.new) { // new is ZoL encryption
      mimetype = 'application/json';
      this.ws.call('core.download', ['pool.dataset.export_keys', [this.volumeName], this.fileName]).pipe(
        takeUntil(this.onDestroy$),
      ).subscribe((res) => {
        this.loader.close();
        const url = res[1];
        this.storage.streamDownloadFile(this.http, url, this.fileName, mimetype).pipe(
          takeUntil(this.onDestroy$),
        ).subscribe((file) => {
          if (res !== null && res !== '') {
            this.storage.downloadBlob(file, this.fileName);
            this.isDownloaded = true;
          }
        });
      }, (e) => {
        this.loader.close();
        new EntityUtils().handleWSError(this, e, this.dialog);
      });
    } else {
      mimetype = 'application/octet-stream';
      this.ws.call('pool.download_encryption_key', payload).pipe(
        takeUntil(this.onDestroy$),
      ).subscribe((res) => {
        this.loader.close();
        this.storage.streamDownloadFile(this.http, res, this.fileName, mimetype).pipe(
          takeUntil(this.onDestroy$),
        ).subscribe((file) => {
          if (res !== null && res !== '') {
            this.storage.downloadBlob(file, this.fileName);
            this.isDownloaded = true;
          }
        });
      }, () => {
        this.isDownloaded = true;
        this.loader.close();
      });
    }
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}
