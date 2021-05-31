import {
  Component, Input, OnDestroy, OnInit,
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ViewControllerComponent } from 'app/core/components/viewcontroller/viewcontroller.component';
import { LayoutService } from 'app/core/services/layout.service';
import { CoreEvent } from 'app/interfaces/events';
import { SysInfoEvent } from 'app/interfaces/events/sys-info-event.interface';
import { EntityDialogComponent } from 'app/pages/common/entity/entity-dialog/entity-dialog.component';
import { Subscription, Subject } from 'rxjs';
import { FailoverDisabledReason } from '../../../enums/failover-disabled-reason.enum';
import { ProductType } from '../../../enums/product-type.enum';
import network_interfaces_helptext from '../../../helptext/network/interfaces/interfaces-list';
import helptext from '../../../helptext/topbar';
import { EntityJobComponent } from '../../../pages/common/entity/entity-job/entity-job.component';
import { EntityUtils } from '../../../pages/common/entity/utils';
import { AppLoaderService } from '../../../services/app-loader/app-loader.service';
import { DialogService } from '../../../services/dialog.service';
import { NotificationAlert, NotificationsService } from '../../../services/notifications.service';
import { PreferencesService } from 'app/core/services/preferences.service';
import { SystemGeneralService } from '../../../services/system-general.service';
import { Theme, ThemeService } from '../../../services/theme/theme.service';
import { WebSocketService } from '../../../services/ws.service';
import { ModalService } from '../../../services/modal.service';
import { T } from '../../../translate-marker';
import { AboutModalDialog } from '../dialog/about/about-dialog.component';
import { DirectoryServicesMonitorComponent } from '../dialog/directory-services-monitor/directory-services-monitor.component';
import { TaskManagerComponent } from '../dialog/task-manager/task-manager.component';
import { MediaObserver } from '@angular/flex-layout';
import { DialogFormConfiguration } from '../../../pages/common/entity/entity-dialog/dialog-form-configuration.interface';
import { TruecommandComponent } from '../dialog/truecommand/truecommand.component';
import { ResilverProgressDialogComponent } from '../dialog/resilver-progress/resilver-progress.component';
import { matchOtherValidator } from 'app/pages/common/entity/entity-form/validators/password-validation';
import { EntityJobState } from 'app/enums/entity-job-state.enum';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'topbar',
  styleUrls: ['./topbar.component.scss'],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent extends ViewControllerComponent implements OnInit, OnDestroy {
  @Input() sidenav: MatSidenav;
  @Input() notificPanel: MatSidenav;

  notifications: NotificationAlert[] = [];

  interval: any;
  updateIsDone: Subscription;
  getProductType: Subscription;
  getAdvancedConfig: Subscription;
  webSocketOnClose: Subscription;

  showResilvering = false;
  pendingNetworkChanges = false;
  waitingNetworkCheckin = false;
  resilveringDetails: any;
  themesMenu: Theme[] = this.themeService.themesMenu;
  currentTheme = 'ix-blue';
  isTaskMangerOpened = false;
  isDirServicesMonitorOpened = false;
  taskDialogRef: MatDialogRef<TaskManagerComponent>;
  dirServicesMonitor: MatDialogRef<DirectoryServicesMonitorComponent>;
  dirServicesStatus: any[] = [];
  showDirServicesIcon = false;
  exposeLegacyUI = false;
  ha_status_text: string;
  ha_disabled_reasons: FailoverDisabledReason[] = [];
  is_ha = false;
  upgradeWaitingToFinish = false;
  pendingUpgradeChecked = false;
  sysName = 'TrueNAS CORE';
  hostname: string;
  showWelcome: boolean;
  checkin_remaining: any;
  checkin_interval: any;
  updateIsRunning = false;
  systemWillRestart = false;
  updateNotificationSent = false;
  private user_check_in_prompted = false;
  mat_tooltips = helptext.mat_tooltips;
  systemType: string;
  isWaiting = false;
  target: Subject<CoreEvent> = new Subject();
  screenSize = 'waiting';

  protected dialogRef: any;
  protected tcConnected = false;
  protected tc_queryCall: 'truecommand.config' = 'truecommand.config';
  protected tc_updateCall: 'truecommand.update' = 'truecommand.update';
  protected isTcStatusOpened = false;
  protected tcStatusDialogRef: MatDialogRef<TruecommandComponent>;
  tcStatus: any;
  onDestroy$ = new Subject();

  readonly FailoverDisabledReason = FailoverDisabledReason;

  constructor(
    public themeService: ThemeService,
    private router: Router,
    private notificationsService: NotificationsService,
    private ws: WebSocketService,
    private dialogService: DialogService,
    public sysGenService: SystemGeneralService,
    public dialog: MatDialog,
    public translate: TranslateService,
    private prefServices: PreferencesService,
    private modalService: ModalService,
    protected loader: AppLoaderService,
    public mediaObserver: MediaObserver,
    private layoutService: LayoutService,
  ) {
    super();
    this.sysGenService.updateRunningNoticeSent.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.updateNotificationSent = true;
    });

    mediaObserver.media$.pipe(takeUntil(this.onDestroy$)).subscribe((evt) => {
      this.screenSize = evt.mqAlias;
    });
  }

  ngOnInit(): void {
    if (window.localStorage.getItem('product_type').includes(ProductType.Enterprise)) {
      this.checkEULA();

      this.ws.call('failover.licensed').pipe(takeUntil(this.onDestroy$)).subscribe((is_ha) => {
        this.is_ha = is_ha;
        this.is_ha ? window.localStorage.setItem('alias_ips', 'show') : window.localStorage.setItem('alias_ips', '0');
        this.getHAStatus();
      });
      this.sysName = 'TrueNAS ENTERPRISE';
    } else {
      window.localStorage.setItem('alias_ips', '0');
      this.checkLegacyUISetting();
    }
    this.ws.subscribe('core.get_jobs').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      if (res && res.fields.method === 'update.update' || res.fields.method === 'failover.upgrade') {
        this.updateIsRunning = true;
        if (res.fields.state === EntityJobState.Failed || res.fields.state === EntityJobState.Aborted) {
          this.updateIsRunning = false;
          this.systemWillRestart = false;
        }

        // When update starts on HA system, listen for 'finish', then quit listening
        if (this.is_ha) {
          this.updateIsDone = this.sysGenService.updateIsDone$.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
            this.updateIsRunning = false;
            this.updateIsDone.unsubscribe();
          });
        }
        if (!this.is_ha) {
          if (res && res.fields && res.fields.arguments[0] && res.fields.arguments[0].reboot) {
            this.systemWillRestart = true;
            if (res.fields.state === EntityJobState.Success) {
              this.router.navigate(['/others/reboot']);
            }
          }
        }

        if (!this.updateNotificationSent) {
          this.updateInProgress();
          this.updateNotificationSent = true;
        }
      }
    });
    const theme = this.themeService.currentTheme();
    this.currentTheme = theme.name;
    this.core.register({ observerClass: this, eventName: 'ThemeListsChanged' }).pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.themesMenu = this.themeService.themesMenu;
    });

    this.ws.call(this.tc_queryCall).pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      this.tcStatus = res;
      this.tcConnected = !!res.api_key;
    });
    this.ws.subscribe(this.tc_queryCall).pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      this.tcStatus = res.fields;
      this.tcConnected = !!res.fields.api_key;
      if (this.isTcStatusOpened && this.tcStatusDialogRef) {
        this.tcStatusDialogRef.componentInstance.update(this.tcStatus);
      }
    });

    const notifications = this.notificationsService.getNotificationList();

    notifications.forEach((notificationAlert: NotificationAlert) => {
      if (notificationAlert.dismissed === false && notificationAlert.level !== 'INFO') {
        this.notifications.push(notificationAlert);
      }
    });
    this.notificationsService.getNotifications().pipe(takeUntil(this.onDestroy$)).subscribe((notifications1) => {
      this.notifications = [];
      notifications1.forEach((notificationAlert: NotificationAlert) => {
        if (notificationAlert.dismissed === false && notificationAlert.level !== 'INFO') {
          this.notifications.push(notificationAlert);
        }
      });
    });
    this.checkNetworkChangesPending();
    this.checkNetworkCheckinWaiting();
    this.getDirServicesStatus();
    this.core.register({ observerClass: this, eventName: 'NetworkInterfacesChanged' }).pipe(takeUntil(this.onDestroy$)).subscribe((evt: CoreEvent) => {
      if (evt && evt.data.commit) {
        this.pendingNetworkChanges = false;
        this.checkNetworkCheckinWaiting();
      } else {
        this.checkNetworkChangesPending();
      }
      if (evt && evt.data.checkin) {
        if (this.checkin_interval) {
          clearInterval(this.checkin_interval);
        }
      }
    });

    this.ws.subscribe('zfs.pool.scan').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      if (res && res.fields.scan.function.indexOf('RESILVER') > -1) {
        this.resilveringDetails = res.fields;
        this.showResilvering = true;
      }
    });

    setInterval(() => {
      if (this.resilveringDetails && this.resilveringDetails.scan.state == EntityJobState.Finished) {
        this.showResilvering = false;
        this.resilveringDetails = '';
      }
    }, 2500);

    this.core.register({
      observerClass: this,
      eventName: 'SysInfo',
    }).pipe(takeUntil(this.onDestroy$)).subscribe((evt: SysInfoEvent) => {
      this.hostname = evt.data.hostname;
    });

    this.getProductType = this.sysGenService.getProductType.pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      this.systemType = res;
    });

    this.core.emit({ name: 'SysInfoRequest', sender: this });

    this.core.register({ observerClass: this, eventName: 'UserPreferences' }).pipe(takeUntil(this.onDestroy$)).subscribe((evt: CoreEvent) => {
      this.preferencesHandler(evt);
    });
    this.core.register({ observerClass: this, eventName: 'UserPreferencesReady' }).pipe(takeUntil(this.onDestroy$)).subscribe((evt: CoreEvent) => {
      this.preferencesHandler(evt);
    });
    this.core.emit({ name: 'UserPreferencesRequest', sender: this });

    this.webSocketOnClose = this.ws.onCloseSubject.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.modalService.close('slide-in-form');
    });
  }

  preferencesHandler(evt: CoreEvent): void {
    if (this.isWaiting) {
      this.target.next({ name: 'SubmitComplete', sender: this });
      this.isWaiting = false;
    }
    this.showWelcome = evt.data.showWelcomeDialog;
    if (this.showWelcome) {
      this.onShowAbout();
    }
  }

  checkLegacyUISetting(): void {
    this.getAdvancedConfig = this.sysGenService.getAdvancedConfig.pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      if (res.legacy_ui) {
        this.exposeLegacyUI = res.legacy_ui;
        window.localStorage.setItem('exposeLegacyUI', res.legacy_ui);
      }
    });
  }

  ngOnDestroy(): void {
    if (typeof (this.interval) !== 'undefined') {
      clearInterval(this.interval);
    }

    this.onDestroy$.next();
    this.onDestroy$.complete();

    this.ws.unsubscribe('failover.disabled_reasons');

    this.core.unregister({ observerClass: this });

    this.getProductType.unsubscribe();

    if (this.getAdvancedConfig) {
      this.getAdvancedConfig.unsubscribe();
    }
    this.webSocketOnClose.unsubscribe();
  }

  toggleNotificationPanel(): void {
    this.notificPanel.toggle();
  }

  toggleCollapse(): void {
    if (this.layoutService.isMobile) {
      this.sidenav.toggle();
    } else {
      this.sidenav.open();
      this.layoutService.isMenuCollapsed = !this.layoutService.isMenuCollapsed;
    }

    this.core.emit({
      name: 'SidenavStatus',
      data: {
        isOpen: this.sidenav.opened,
        mode: this.sidenav.mode,
        isCollapsed: this.layoutService.isMenuCollapsed,
      },
      sender: this,
    });
  }

  onShowAbout(): void {
    this.dialog.open(AboutModalDialog, {
      maxWidth: '600px',
      data: {
        extraMsg: this.showWelcome,
        systemType: this.systemType,
      },
      disableClose: true,
    });
  }

  signOut(): void {
    this.ws.logout();
  }

  onShutdown(): void {
    this.dialogService.confirm(
      this.translate.instant('Shut down'),
      this.translate.instant('Shut down the system?'),
      false,
      this.translate.instant('Shut Down'),
    ).pipe(takeUntil(this.onDestroy$)).subscribe((res: boolean) => {
      if (!res) {
        return;
      }

      this.router.navigate(['/others/shutdown']);
    });
  }

  onReboot(): void {
    this.dialogService.confirm(
      this.translate.instant('Restart'),
      this.translate.instant('Restart the system?'),
      false,
      this.translate.instant('Restart'),
    ).pipe(takeUntil(this.onDestroy$)).subscribe((res: any) => {
      if (!res) {
        return;
      }

      this.router.navigate(['/others/reboot']);
    });
  }

  checkEULA(): void {
    this.ws.call('truenas.is_eula_accepted').pipe(takeUntil(this.onDestroy$)).subscribe((isEulaAccepted) => {
      if (!isEulaAccepted || window.localStorage.getItem('upgrading_status') === 'upgrading') {
        this.ws.call('truenas.get_eula').pipe(takeUntil(this.onDestroy$)).subscribe((eula) => {
          this.dialogService.confirm(T('End User License Agreement - TrueNAS'), eula, true,
            T('I Agree'), false, null, '', null, null, true).pipe(takeUntil(this.onDestroy$)).subscribe((accept_eula: boolean) => {
            if (accept_eula) {
              window.localStorage.removeItem('upgrading_status');
              this.ws.call('truenas.accept_eula').pipe(takeUntil(this.onDestroy$)).subscribe();
            }
          });
        });
      }
    });
  }

  checkNetworkChangesPending(): void {
    this.ws.call('interface.has_pending_changes').pipe(takeUntil(this.onDestroy$)).subscribe((hasPendingChanges) => {
      this.pendingNetworkChanges = hasPendingChanges;
    });
  }

  checkNetworkCheckinWaiting(): void {
    this.ws.call('interface.checkin_waiting').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      if (res != null) {
        const seconds = res;
        if (seconds > 0 && this.checkin_remaining == null) {
          this.checkin_remaining = seconds;
          this.checkin_interval = setInterval(() => {
            if (this.checkin_remaining > 0) {
              this.checkin_remaining -= 1;
            } else {
              this.checkin_remaining = null;
              clearInterval(this.checkin_interval);
              window.location.reload(); // should just refresh after the timer goes off
            }
          }, 1000);
        }
        this.waitingNetworkCheckin = true;
        if (!this.user_check_in_prompted) {
          this.user_check_in_prompted = true;
          this.showNetworkCheckinWaiting();
        }
      } else {
        this.waitingNetworkCheckin = false;
        if (this.checkin_interval) {
          clearInterval(this.checkin_interval);
        }
      }
    });
  }

  showNetworkCheckinWaiting(): void {
    // only popup dialog if not in network page
    if (this.router.url !== '/network') {
      this.dialogService.confirm(
        network_interfaces_helptext.checkin_title,
        network_interfaces_helptext.pending_checkin_dialog_text,
        true, network_interfaces_helptext.checkin_button,
      ).pipe(takeUntil(this.onDestroy$)).subscribe((res: boolean) => {
        if (res) {
          this.user_check_in_prompted = false;
          this.loader.open();
          this.ws.call('interface.checkin').pipe(takeUntil(this.onDestroy$)).subscribe(() => {
            this.core.emit({ name: 'NetworkInterfacesChanged', data: { commit: true, checkin: true }, sender: this });
            this.loader.close();
            this.dialogService.Info(
              network_interfaces_helptext.checkin_complete_title,
              network_interfaces_helptext.checkin_complete_message,
            );
            this.waitingNetworkCheckin = false;
          }, (err) => {
            this.loader.close();
            new EntityUtils().handleWSError(null, err, this.dialogService);
          });
        }
      });
    }
  }

  showNetworkChangesPending(): void {
    if (this.waitingNetworkCheckin) {
      this.showNetworkCheckinWaiting();
    } else {
      this.dialogService.confirm(
        network_interfaces_helptext.pending_changes_title,
        network_interfaces_helptext.pending_changes_message,
        true, T('Continue'),
      ).pipe(takeUntil(this.onDestroy$)).subscribe((res: boolean) => {
        if (res) {
          this.router.navigate(['/network']);
        }
      });
    }
  }

  showResilveringDetails(): void {
    this.dialogRef = this.dialog.open(ResilverProgressDialogComponent);
  }

  onGoToLegacy(): void {
    this.dialogService.confirm(T('Warning'),
      helptext.legacyUIWarning,
      true, T('Continue to Legacy UI')).pipe(takeUntil(this.onDestroy$)).subscribe((res: boolean) => {
      if (res) {
        window.location.href = '/legacy/';
      }
    });
  }

  onShowTaskManager(): void {
    if (this.isTaskMangerOpened) {
      this.taskDialogRef.close(true);
    } else {
      this.isTaskMangerOpened = true;
      this.taskDialogRef = this.dialog.open(TaskManagerComponent, {
        disableClose: false,
        width: '400px',
        hasBackdrop: true,
        position: {
          top: '48px',
          right: '0px',
        },
      });
    }

    this.taskDialogRef.afterClosed().pipe(takeUntil(this.onDestroy$)).subscribe(
      () => {
        this.isTaskMangerOpened = false;
      },
    );
  }

  onShowDirServicesMonitor(): void {
    if (this.isDirServicesMonitorOpened) {
      this.dirServicesMonitor.close(true);
    } else {
      this.isDirServicesMonitorOpened = true;
      this.dirServicesMonitor = this.dialog.open(DirectoryServicesMonitorComponent, {
        disableClose: false,
        width: '400px',
        hasBackdrop: true,
        position: {
          top: '48px',
          right: '0px',
        },
      });
    }

    this.dirServicesMonitor.afterClosed().pipe(takeUntil(this.onDestroy$)).subscribe(
      () => {
        this.isDirServicesMonitorOpened = false;
      },
    );
  }

  updateHAInfo(info: any): void {
    this.ha_disabled_reasons = info.reasons;
    if (info.status == 'HA Enabled') {
      this.ha_status_text = helptext.ha_status_text_enabled;
      if (!this.pendingUpgradeChecked) {
        this.checkUpgradePending();
      }
    } else {
      this.ha_status_text = helptext.ha_status_text_disabled;
    }
  }

  getHAStatus(): void {
    this.core.register({ observerClass: this, eventName: 'HA_Status' }).pipe(takeUntil(this.onDestroy$)).subscribe((evt: CoreEvent) => {
      this.updateHAInfo(evt.data);
    });
  }

  showHAStatus(): void {
    let reasons = '<ul>\n';
    let ha_icon = 'info';
    let ha_status = '';
    if (this.ha_disabled_reasons.length > 0) {
      ha_status = helptext.ha_status_text_disabled;
      ha_icon = 'warning';
      for (let i = 0; i < this.ha_disabled_reasons.length; i++) {
        const reason_text = helptext.ha_disabled_reasons[this.ha_disabled_reasons[i]];
        this.translate.get(reason_text).pipe(takeUntil(this.onDestroy$)).subscribe(() => {
          reasons = reasons + '<li>' + reason_text + '</li>\n';
        });
      }
    } else {
      ha_status = helptext.ha_status_text_enabled;
      this.translate.get(helptext.ha_is_enabled).pipe(takeUntil(this.onDestroy$)).subscribe((ha_is_enabled) => {
        reasons = reasons + '<li>' + ha_is_enabled + '</li>\n';
      });
    }
    reasons = reasons + '</ul>';

    this.dialogService.Info(ha_status, reasons, '500px', ha_icon, true);
  }

  checkUpgradePending(): void {
    this.ws.call('failover.upgrade_pending').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      this.pendingUpgradeChecked = true;
      this.upgradeWaitingToFinish = res;
      if (res) {
        this.upgradePendingDialog();
      }
    });
  }

  upgradePendingDialog(): void {
    this.dialogService.confirm(
      T('Pending Upgrade'),
      T('There is an upgrade waiting to finish.'),
      true, T('Continue'),
    ).pipe(takeUntil(this.onDestroy$)).subscribe((res: boolean) => {
      if (res) {
        this.dialogRef = this.dialog.open(EntityJobComponent, { data: { title: T('Update') }, disableClose: false });
        this.dialogRef.componentInstance.setCall('failover.upgrade_finish');
        this.dialogRef.componentInstance.disableProgressValue(true);
        this.dialogRef.componentInstance.submit();
        this.dialogRef.componentInstance.success.pipe(takeUntil(this.onDestroy$)).subscribe((success: any) => {
          this.dialogRef.close(false);
          console.info('success', success);
          this.upgradeWaitingToFinish = false;
        });
        this.dialogRef.componentInstance.failure.pipe(takeUntil(this.onDestroy$)).subscribe((failure: any) => {
          this.dialogService.errorReport(failure.error, failure.reason, failure.trace.formatted);
        });
      }
    });
  }

  getDirServicesStatus(): void {
    this.ws.call('directoryservices.get_state').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      for (const i in res) {
        this.dirServicesStatus.push(res[i]);
      }
      this.showDSIcon();
    });
    this.ws.subscribe('directoryservices.status').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      this.dirServicesStatus = [];
      for (const i in res.fields) {
        this.dirServicesStatus.push(res.fields[i]);
      }
      this.showDSIcon();
    });
  }

  showDSIcon(): void {
    this.showDirServicesIcon = false;
    this.dirServicesStatus.forEach((item) => {
      if (item !== 'DISABLED') {
        this.showDirServicesIcon = true;
      }
    });
  }

  updateInProgress(): void {
    this.sysGenService.updateRunning.emit('true');
    if (!this.updateNotificationSent) {
      this.showUpdateDialog();
      this.updateNotificationSent = true;
    }
  }

  showUpdateDialog(): void {
    const message = this.is_ha || !this.systemWillRestart ? helptext.updateRunning_dialog.message
      : helptext.updateRunning_dialog.message + helptext.updateRunning_dialog.message_pt2;
    this.dialogService.confirm(helptext.updateRunning_dialog.title,
      message,
      true, T('Close'), false, '', '', '', '', true);
  }

  openIX(): void {
    window.open('https://www.ixsystems.com/', '_blank');
  }

  showTCStatus(): void {
    this.tcConnected ? this.openStatusDialog() : this.openSignupDialog();
  }

  openSignupDialog(): void {
    const conf: DialogFormConfiguration = {
      title: helptext.signupDialog.title,
      message: helptext.signupDialog.content,
      fieldConfig: [],
      saveButtonText: helptext.signupDialog.connect_btn,
      custActions: [
        {
          id: 'signup',
          name: helptext.signupDialog.singup_btn,
          function: () => {
            window.open('https://portal.ixsystems.com');
            this.dialogService.closeAllDialogs();
          },
        },
      ],
      parent: this,
      customSubmit(entityDialog: EntityDialogComponent) {
        entityDialog.dialogRef.close();
        entityDialog.parent.updateTC();
      },
    };
    this.dialogService.dialogForm(conf);
  }

  updateTC(): void {
    const self = this;
    let updateDialog: EntityDialogComponent;
    const conf: DialogFormConfiguration = {
      title: self.tcConnected ? helptext.updateDialog.title_update : helptext.updateDialog.title_connect,
      fieldConfig: [
        {
          type: 'input',
          name: 'api_key',
          placeholder: helptext.updateDialog.api_placeholder,
          tooltip: helptext.updateDialog.api_tooltip,
        },
        {
          type: 'checkbox',
          name: 'enabled',
          placeholder: helptext.updateDialog.enabled_placeholder,
          tooltip: helptext.updateDialog.enabled_tooltip,
          value: true,
        },
      ],
      custActions: [{
        id: 'deregister',
        name: helptext.tcDeregisterBtn,
        function: () => {
          self.dialogService.generalDialog({
            title: helptext.tcDeregisterDialog.title,
            icon: helptext.tcDeregisterDialog.icon,
            message: helptext.tcDeregisterDialog.message,
            confirmBtnMsg: helptext.tcDeregisterDialog.confirmBtnMsg,
          }).pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
            if (res) {
              self.loader.open();
              self.ws.call(self.tc_updateCall, [{ api_key: null, enabled: false }]).pipe(takeUntil(this.onDestroy$)).subscribe(
                () => {
                  self.loader.close();
                  updateDialog.dialogRef.close();
                  self.tcStatusDialogRef.close(true);
                  self.dialogService.generalDialog({
                    title: helptext.deregisterInfoDialog.title,
                    message: helptext.deregisterInfoDialog.message,
                    hideCancel: true,
                  });
                },
                (err) => {
                  self.loader.close();
                  new EntityUtils().handleWSError(updateDialog.parent, err, updateDialog.parent.dialogService);
                },
              );
            }
          });
        },
      }],
      isCustActionVisible(actionId: string) {
        return !(actionId === 'deregister' && !self.tcConnected);
      },
      saveButtonText: self.tcConnected ? helptext.updateDialog.save_btn : helptext.updateDialog.connect_btn,
      parent: this,
      afterInit(entityDialog: EntityDialogComponent) {
        updateDialog = entityDialog;
        // load settings
        if (self.tcConnected) {
          Object.keys(self.tcStatus).forEach((key) => {
            const ctrl = entityDialog.formGroup.controls[key];
            if (ctrl) {
              ctrl.setValue(self.tcStatus[key]);
            }
          });
        }
      },
      customSubmit(entityDialog: EntityDialogComponent) {
        self.loader.open();
        self.ws.call(self.tc_updateCall, [entityDialog.formValue]).pipe(takeUntil(this.onDestroy$)).subscribe(
          () => {
            self.loader.close();
            entityDialog.dialogRef.close();
            // only show this for connecting TC
            if (!self.tcConnected) {
              self.dialogService.Info(helptext.checkEmailInfoDialog.title, helptext.checkEmailInfoDialog.message);
            }
          },
          (err) => {
            self.loader.close();
            new EntityUtils().handleWSError(entityDialog.parent, err, entityDialog.parent.dialogService);
          },
        );
      },
    };
    this.dialogService.dialogForm(conf);
  }

  openStatusDialog(): void {
    const injectData = {
      parent: this,
      data: this.tcStatus,
    };
    if (this.isTcStatusOpened) {
      this.tcStatusDialogRef.close(true);
    } else {
      this.isTcStatusOpened = true;
      this.tcStatusDialogRef = this.dialog.open(TruecommandComponent, {
        disableClose: false,
        width: '400px',
        hasBackdrop: true,
        position: {
          top: '48px',
          right: '0px',
        },
        data: injectData,
      });
    }

    this.tcStatusDialogRef.afterClosed().pipe(takeUntil(this.onDestroy$)).subscribe(
      () => {
        this.isTcStatusOpened = false;
      },
    );
  }

  stopTCConnecting(): void {
    this.dialogService.generalDialog({
      title: helptext.stopTCConnectingDialog.title,
      icon: helptext.stopTCConnectingDialog.icon,
      message: helptext.stopTCConnectingDialog.message,
      confirmBtnMsg: helptext.stopTCConnectingDialog.confirmBtnMsg,
    }).pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      if (res) {
        this.loader.open();
        this.ws.call(this.tc_updateCall, [{ enabled: false }]).pipe(takeUntil(this.onDestroy$)).subscribe(
          () => {
            this.loader.close();
          },
          (err) => {
            this.loader.close();
            new EntityUtils().handleWSError(this, err, this.dialogService);
          },
        );
      }
    });
  }

  openChangePasswordDialog(): void {
    const conf: DialogFormConfiguration = {
      title: T('Change Password'),
      message: helptext.changePasswordDialog.pw_form_title_name,
      fieldConfig: [
        {
          type: 'input',
          name: 'curr_password',
          placeholder: helptext.changePasswordDialog.pw_current_pw_placeholder,
          inputType: 'password',
          required: true,
          togglePw: true,
        },
        {
          type: 'input',
          name: 'password',
          placeholder: helptext.changePasswordDialog.pw_new_pw_placeholder,
          inputType: 'password',
          required: true,
          tooltip: helptext.changePasswordDialog.pw_new_pw_tooltip,
        },
        {
          type: 'input',
          name: 'password_conf',
          placeholder: helptext.changePasswordDialog.pw_confirm_pw_placeholder,
          inputType: 'password',
          required: true,
          validation: [matchOtherValidator('password')],
        },
      ],
      saveButtonText: T('Save'),
      custActions: [],
      parent: this,
      customSubmit: (entityDialog: EntityDialogComponent) => {
        this.loader.open();
        const pwChange = entityDialog.formValue;
        delete pwChange.password_conf;
        entityDialog.dialogRef.close();
        this.ws.call('auth.check_user', ['root', pwChange.curr_password]).pipe(takeUntil(this.onDestroy$)).subscribe((check) => {
          if (check) {
            delete pwChange.curr_password;
            this.ws.call('user.update', [1, pwChange]).pipe(takeUntil(this.onDestroy$)).subscribe(() => {
              this.loader.close();
              this.dialogService.Info(T('Success'), helptext.changePasswordDialog.pw_updated, '300px', 'info', false);
            }, (res) => {
              this.loader.close();
              this.dialogService.Info(T('Error'), res, '300px', 'warning', false);
            });
          } else {
            this.loader.close();
            this.dialogService.Info(helptext.changePasswordDialog.pw_invalid_title, helptext.changePasswordDialog.pw_invalid_title, '300px', 'warning', false);
          }
        }, (res) => {
          this.loader.close();
          this.dialogService.Info(T('Error'), res, '300px', 'warning', false);
        });
      },
    };
    this.dialogService.dialogForm(conf);
  }

  navExternal(link: string): void {
    window.open(link);
  }
}
