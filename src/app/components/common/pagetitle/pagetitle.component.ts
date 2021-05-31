import {
  Component, OnInit, AfterViewInit, OnDestroy, Input, ViewChild,
} from '@angular/core';
import {
  Router, NavigationEnd, ActivatedRoute,
} from '@angular/router';
import { CoreEvent } from 'app/interfaces/events';
import { filter, takeUntil } from 'rxjs/operators';
import { ProductType } from '../../../enums/product-type.enum';
import { RoutePartsService } from '../../../services/route-parts/route-parts.service';
import { CoreService } from 'app/core/services/core.service';
import { ViewControllerComponent } from 'app/core/components/viewcontroller/viewcontroller.component';
import { ViewButtonComponent } from 'app/core/components/viewbutton/viewbutton.component';
import { LocaleService } from 'app/services/locale.service';
import { Subject } from 'rxjs';

export interface GlobalAction {
  applyConfig(config: any): any;
}

@Component({
  selector: 'pagetitle',
  templateUrl: './pagetitle.component.html',
})
export class PageTitleComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('viewcontroller', { static: false }) viewcontroller: ViewControllerComponent;
  @Input() breadcrumbs: boolean;
  @Input() product_type: ProductType;
  titleText: string;
  copyrightYear = this.localeService.getCopyrightYearFromBuildTime();
  private hasInitialized = false;
  private globalActionsConfig: any;
  private globalActions: any;

  onDestroy$ = new Subject();
  routeParts: any[];
  isEnabled = true;
  constructor(private router: Router,
    private routePartsService: RoutePartsService,
    private activeRoute: ActivatedRoute,
    private core: CoreService,
    private localeService: LocaleService) {
  }

  ngOnInit(): void {
  // must be running once to get breadcrumbs
    this.routeParts = this.routePartsService.generateRouteParts(this.activeRoute.snapshot);
    this.titleText = this.routeParts && this.routeParts[0].title ? this.routeParts[0].title : '';

    // generate url from parts
    this.routeParts.reverse().map((item, i) => {
      // prepend / to first part
      if (i === 0) {
        item.url = `/${item.url}`;
        if (!item['toplevel']) {
          item.disabled = true;
        }
        return item;
      }
      // prepend previous part to current part
      item.url = `${this.routeParts[i - 1].url}/${item.url}`;
      return item;
    });

    // only execute when routechange
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      takeUntil(this.onDestroy$),
    ).subscribe(() => {
      this.destroyActions();

      this.routeParts = this.routePartsService.generateRouteParts(this.activeRoute.snapshot);
      this.titleText = this.routeParts && this.routeParts[0].title ? this.routeParts[0].title : '';

      // generate url from parts
      this.routeParts.reverse().map((item, i) => {
        // prepend / to first part
        if (i === 0) {
          item.url = `/${item.url}`;
          if (!item['toplevel']) {
            item.disabled = true;
          }
          return item;
        }
        // prepend previous part to current part
        item.url = `${this.routeParts[i - 1].url}/${item.url}`;
        return item;
      });
    });

    // Pseudo routing events (for reports page)
    this.core.register({ observerClass: this, eventName: 'PseudoRouteChange' }).pipe(takeUntil(this.onDestroy$)).subscribe((evt: CoreEvent) => {
      this.routeParts = evt.data;
      // generate url from parts
      this.routeParts.map((item, i) => {
        // prepend / to first part
        if (i === 0) {
          item.url = `/${item.url}`;
          item.disabled = true;
          return item;
        }
        // prepend previous part to current part
        item.url = `${this.routeParts[i - 1].url}/${item.url}`;
        return item;
      });
    });

    this.core.register({ observerClass: this, eventName: 'GlobalActions' }).pipe(takeUntil(this.onDestroy$)).subscribe((evt: CoreEvent) => {
      // CONFIG OBJECT EXAMPLE: { actionType: EntityTableAddActionsComponent, actionConfig: this };
      this.globalActionsConfig = evt.data;

      if (this.hasInitialized) {
        this.renderActions(this.globalActionsConfig);
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.globalActionsConfig) {
      this.renderActions(this.globalActionsConfig);
    }
    this.hasInitialized = true;
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
    this.core.unregister({ observerClass: this });
    delete this.globalActionsConfig;
  }

  createAction(): void {
    this.viewcontroller.layoutContainer = { layout: 'row', align: 'end center', gap: '2px' };
    this.globalActions = this.viewcontroller.create(ViewButtonComponent);
    this.globalActions.label = 'Global Action';
    this.globalActions.tooltipEnabled = true;
    this.globalActions.tooltipPlacement = 'above';
    this.globalActions.tooltipText = 'Tooltip Text Goes Here';
    this.viewcontroller.addChild(this.globalActions);
  }

  renderActions(config: any): void {
    if (this.globalActions) {
      this.destroyActions();
    }

    this.viewcontroller.layoutContainer = { layout: 'row', align: 'end center', gap: '2px' };
    this.globalActions = this.viewcontroller.create(config.actionType);

    if (!this.globalActions.applyConfig) {
      throw 'Components must implement GlobalAction Interface';
    }

    this.globalActions.applyConfig(config.actionConfig); // Passes entity object
    this.viewcontroller.addChild(this.globalActions);
  }

  destroyActions(): void {
    if (this.globalActions) {
      this.viewcontroller.removeChild(this.globalActions);
      this.globalActionsConfig = null;
    }

    this.globalActions = null;
  }
}
