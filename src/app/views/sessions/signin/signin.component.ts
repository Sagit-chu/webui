import {
  Component, OnInit, ViewChild, OnDestroy, ElementRef, AfterViewInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatButton } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormBuilder, FormGroup, Validators, FormControl, AbstractControl,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CoreEvent } from 'app/interfaces/events';
import { FailoverDisabledReason } from '../../../enums/failover-disabled-reason.enum';
import { ProductType } from '../../../enums/product-type.enum';
import { matchOtherValidator } from '../../../pages/common/entity/entity-form/validators/password-validation';
import { TranslateService } from '@ngx-translate/core';
import globalHelptext from '../../../helptext/global-helptext';
import productText from '../../../helptext/product';
import helptext from '../../../helptext/topbar';
import { Subject, Subscription } from 'rxjs';

import { T } from '../../../translate-marker';
import { WebSocketService } from '../../../services/ws.service';
import { SystemGeneralService } from '../../../services';
import { DialogService } from '../../../services/dialog.service';
import { CoreService } from 'app/core/services/core.service';
import { ApiService } from 'app/core/services/api.service';
import { AutofillMonitor } from '@angular/cdk/text-field';
import { LocaleService } from 'app/services/locale.service';
import { takeUntil } from 'rxjs/operators';
@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],
})
export class SigninComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatProgressBar, { static: false }) progressBar: MatProgressBar;
  @ViewChild(MatButton, { static: false }) submitButton: MatButton;
  @ViewChild('username', { read: ElementRef }) usernameInput: ElementRef<HTMLElement>;

  private failed: Boolean = false;
  product_type: ProductType;
  logo_ready: Boolean = false;
  product = productText.product;
  showPassword = false;
  ha_info_ready = false;
  checking_status = false;

  _copyrightYear = '';
  get copyrightYear(): string {
    return window.localStorage && window.localStorage.buildtime ? this.localeService.getCopyrightYearFromBuildTime() : '';
  }

  private interval: any;
  exposeLegacyUI = false;
  tokenObservable: Subscription;
  HAInterval: any;
  isTwoFactor = false;
  private didSetFocus = false;

  signinData = {
    username: '',
    password: '',
    otp: '',
  };
  setPasswordFormGroup: FormGroup;
  has_root_password: Boolean = true;
  failover_status = '';
  failover_statuses = {
    SINGLE: '',
    MASTER: T(`Active ${globalHelptext.Ctrlr}.`),
    BACKUP: T(`Standby ${globalHelptext.Ctrlr}.`),
    ELECTING: T(`Electing ${globalHelptext.Ctrlr}.`),
    IMPORTING: T('Importing pools.'),
    ERROR: T('Failover is in an error state.'),
  };
  failover_ips: string[] = [];
  ha_disabled_reasons: FailoverDisabledReason[] = [];
  show_reasons = false;
  reason_text = {};
  ha_status_text = T('Checking HA status');
  ha_status = false;
  tc_ip: string;
  protected tc_url: string;
  onDestroy$ = new Subject();

  readonly ProductType = ProductType;

  constructor(private ws: WebSocketService, private router: Router,
    private snackBar: MatSnackBar, public translate: TranslateService,
    private dialogService: DialogService,
    private fb: FormBuilder,
    private core: CoreService,
    private api: ApiService,
    private _autofill: AutofillMonitor,
    private http: HttpClient, private sysGeneralService: SystemGeneralService, private localeService: LocaleService) {
    this.ws = ws;
    const ha_status = window.sessionStorage.getItem('ha_status');
    if (ha_status && ha_status === 'true') {
      this.ha_status = true;
    }
    this.checkSystemType();
    this.ws.call('truecommand.connected').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      if (res.connected) {
        this.tc_ip = res.truecommand_ip;
        this.tc_url = res.truecommand_url;
      }
    });
    this.reason_text = helptext.ha_disabled_reasons;
  }

  checkSystemType(): void {
    if (!this.logo_ready) {
      this.sysGeneralService.getProductType.pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
        this.logo_ready = true;
        this.product_type = res as ProductType;
        if (this.interval) {
          clearInterval(this.interval);
        }
        if (this.product_type.includes(ProductType.Enterprise) || this.product_type === ProductType.Scale) {
          if (this.HAInterval) {
            clearInterval(this.HAInterval);
          }
          this.getHAStatus();
          this.HAInterval = setInterval(() => {
            this.getHAStatus();
          }, 6000);
        } else if (this.canLogin()) {
          this.checkBuildtime();
          this.loginToken();
        }
        window.localStorage.setItem('product_type', res);
        if (this.product_type === ProductType.Enterprise && window.localStorage.exposeLegacyUI === 'true') {
          this.exposeLegacyUI = true;
        }
      });
    }
  }

  ngAfterViewInit(): void {
    this._autofill.monitor(this.usernameInput).pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      if (!this.didSetFocus) {
        this.didSetFocus = true;
        this.usernameInput.nativeElement.focus();
      }
    });
  }

  ngOnInit(): void {
    this.core.register({ observerClass: this, eventName: 'ThemeChanged' }).pipe(takeUntil(this.onDestroy$)).subscribe((evt: CoreEvent) => {
      if (this.router.url == '/sessions/signin' && evt.sender.userThemeLoaded == true) {
        this.redirect();
      }
    });
    if (!this.logo_ready) {
      this.interval = setInterval(() => {
        this.checkSystemType();
      }, 5000);
    }

    if (this.canLogin()) {
      this.checkBuildtime();
      this.loginToken();
    }

    this.ws.call('user.has_root_password').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      this.has_root_password = res;
    });

    this.setPasswordFormGroup = this.fb.group({
      password: new FormControl('', [Validators.required]),
      password2: new FormControl('', [Validators.required, matchOtherValidator('password')]),
    });

    this.ws.call('auth.two_factor_auth').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      this.isTwoFactor = res;
    });
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    if (this.HAInterval) {
      clearInterval(this.HAInterval);
    }
    this.onDestroy$.next();
    this.onDestroy$.complete();
    this.core.unregister({ observerClass: this });
    if (this.tokenObservable) {
      this.tokenObservable.unsubscribe();
    }
  }

  loginToken(): void {
    let middleware_token;
    if ((window as any)['MIDDLEWARE_TOKEN']) {
      middleware_token = (window as any)['MIDDLEWARE_TOKEN'];
      (window as any)['MIDDLEWARE_TOKEN'] = null;
    } else if (window.localStorage.getItem('middleware_token')) {
      middleware_token = window.localStorage.getItem('middleware_token');
      window.localStorage.removeItem('middleware_token');
    }

    if (middleware_token) {
      this.ws.login_token(middleware_token)
        .pipe(takeUntil(this.onDestroy$))
        .subscribe((result) => {
          this.loginCallback(result);
        });
    }
    if (this.ws.token && this.ws.redirectUrl != undefined) {
      if (this.submitButton) {
        this.submitButton.disabled = true;
      }
      if (this.progressBar) {
        this.progressBar.mode = 'indeterminate';
      }

      if (sessionStorage.currentUrl != undefined) {
        this.ws.redirectUrl = sessionStorage.currentUrl;
      }

      this.ws.login_token(this.ws.token)
        .pipe(takeUntil(this.onDestroy$))
        .subscribe((result) => { this.loginCallback(result); });
    }
  }

  checkBuildtime(): void {
    this.ws.call('system.build_time').pipe(takeUntil(this.onDestroy$)).subscribe((buildTime) => {
      const buildtime = String(buildTime.$date);
      const previous_buildtime = window.localStorage.getItem('buildtime');
      if (buildtime !== previous_buildtime) {
        window.localStorage.setItem('buildtime', buildtime);
        this._copyrightYear = this.localeService.getCopyrightYearFromBuildTime();
      }
    });
  }

  canLogin(): boolean {
    if (this.logo_ready && this.connected
       && (this.failover_status === 'SINGLE'
        || this.failover_status === 'MASTER'
        || this.product_type === ProductType.Core)) {
      if (!this.didSetFocus && this.usernameInput) {
        setTimeout(() => {
          this.didSetFocus = true;
          this.usernameInput.nativeElement.focus();
        }, 10);
      }

      return true;
    }

    return false;
  }

  getHAStatus(): void {
    if ((this.product_type.includes(ProductType.Enterprise) || this.product_type === ProductType.Scale)
      && !this.checking_status) {
      this.checking_status = true;
      this.ws.call('failover.status').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
        this.failover_status = res;
        this.ha_info_ready = true;
        if (res !== 'SINGLE') {
          this.ws.call('failover.get_ips').pipe(takeUntil(this.onDestroy$)).subscribe((ips) => {
            this.failover_ips = ips;
          }, (err) => {
            console.error(err);
          });
          this.ws.call('failover.disabled_reasons').pipe(takeUntil(this.onDestroy$)).subscribe((reasons) => {
            this.checking_status = false;
            this.ha_disabled_reasons = reasons;
            this.show_reasons = false;
            if (reasons.length === 0) {
              this.ha_status_text = T('HA is enabled.');
              this.ha_status = true;
            } else if (reasons.length === 1) {
              if (reasons[0] === FailoverDisabledReason.NoSystemReady) {
                this.ha_status_text = T('HA is reconnecting.');
              } else if (reasons[0] === FailoverDisabledReason.NoFailover) {
                this.ha_status_text = T('HA is administratively disabled.');
              }
              this.ha_status = false;
            } else {
              this.ha_status_text = T('HA is in a faulted state');
              this.show_reasons = true;
              this.ha_status = false;
            }
            window.sessionStorage.setItem('ha_status', this.ha_status.toString());
            if (this.canLogin()) {
              this.checkBuildtime();
              this.loginToken();
            }
          }, (err) => {
            this.checking_status = false;
            console.error(err);
          },
          () => {
            this.checking_status = false;
          });
        } else if (this.canLogin()) {
          this.checkBuildtime();
          this.loginToken();
        }
      }, (err) => {
        this.checking_status = false;
        console.error(err);
      });
    }
  }

  get password(): AbstractControl {
    return this.setPasswordFormGroup.get('password');
  }
  get password2(): AbstractControl {
    return this.setPasswordFormGroup.get('password2');
  }

  connected(): boolean {
    return this.ws.connected;
  }

  signin(): void {
    this.submitButton.disabled = true;
    this.progressBar.mode = 'indeterminate';

    if (this.isTwoFactor) {
      this.ws.login(this.signinData.username, this.signinData.password, this.signinData.otp)
        .pipe(takeUntil(this.onDestroy$))
        .subscribe((result) => { this.loginCallback(result); });
    } else {
      this.ws.login(this.signinData.username, this.signinData.password)
        .pipe(takeUntil(this.onDestroy$))
        .subscribe((result) => { this.loginCallback(result); });
    }
  }

  setpassword(): void {
    this.ws.call('user.set_root_password', [this.password.value]).pipe(
      takeUntil(this.onDestroy$),
    ).subscribe(
      () => {
        this.ws.login('root', this.password.value)
          .pipe(takeUntil(this.onDestroy$))
          .subscribe((result) => { this.loginCallback(result); });
      },
    );
  }

  loginCallback(result: boolean): void {
    if (result === true) {
      this.successLogin();
    } else {
      this.errorLogin();
    }
  }

  redirect(): void {
    if (this.ws.token) {
      if (this.interval) {
        clearInterval(this.interval);
      }
      if (this.HAInterval) {
        clearInterval(this.HAInterval);
      }
      if (this.ws.redirectUrl) {
        this.router.navigateByUrl(this.ws.redirectUrl);
        this.ws.redirectUrl = '';
      } else {
        this.router.navigate(['/dashboard']);
      }
      this.tokenObservable.unsubscribe();
    }
  }

  successLogin(): void {
    this.snackBar.dismiss();
    this.tokenObservable = this.ws.call('auth.generate_token', [300]).pipe(
      takeUntil(this.onDestroy$),
    ).subscribe((token) => {
      if (!token) {
        return;
      }

      this.ws.token = token;
      this.redirect();
    });
  }

  errorLogin(): void {
    this.submitButton.disabled = false;
    this.failed = true;
    this.progressBar.mode = 'determinate';
    this.signinData.password = '';
    this.signinData.otp = '';
    let message = '';
    if (this.ws.token === null) {
      this.isTwoFactor ? message = T('Username, Password, or 2FA Code is incorrect.')
        : message = T('Username or Password is incorrect.');
    } else {
      message = T('Token expired, please log back in.');
      this.ws.token = null;
    }
    const closeString = this.translate.instant('close');
    const messageString = this.translate.instant(message);
    this.snackBar.open(messageString, closeString, { duration: 4000 });
  }

  onGoToLegacy(): void {
    this.dialogService.confirm(T('Warning'),
      globalHelptext.legacyUIWarning,
      true, T('Continue to Legacy UI')).pipe(takeUntil(this.onDestroy$)).subscribe((res: boolean) => {
      if (res) {
        window.location.href = '/legacy/';
      }
    });
  }

  openIX(): void {
    window.open('https://www.ixsystems.com/', '_blank');
  }

  gotoTC(): void {
    this.dialogService.generalDialog({
      title: helptext.tcDialog.title,
      message: helptext.tcDialog.message,
      is_html: true,
      confirmBtnMsg: helptext.tcDialog.confirmBtnMsg,
    }).pipe(
      takeUntil(this.onDestroy$),
    ).subscribe((res) => {
      if (res) {
        window.open(this.tc_url);
      }
    });
  }
}
