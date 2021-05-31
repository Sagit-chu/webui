import {
  Component, OnInit, Input, OnDestroy,
} from '@angular/core';
import {
  Router, NavigationEnd, ActivatedRoute,
} from '@angular/router';
import { CoreEvent } from 'app/interfaces/events';
import { ProductType } from '../../../enums/product-type.enum';
import { RoutePartsService } from '../../../services/route-parts/route-parts.service';
import { CoreService } from 'app/core/services/core.service';
import { filter, takeUntil } from 'rxjs/operators';
import { LocaleService } from 'app/services/locale.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  @Input() product_type: ProductType;
  copyrightYear = this.localeService.getCopyrightYearFromBuildTime();
  onDestroy$ = new Subject();

  routeParts: any[];
  isEnabled = true;
  constructor(private router: Router,
    private routePartsService: RoutePartsService,
    private activeRoute: ActivatedRoute,
    private core: CoreService,
    private localeService: LocaleService) { }

  ngOnInit(): void {
  // must be running once to get breadcrumbs
    this.routeParts = this.routePartsService.generateRouteParts(this.activeRoute.snapshot);
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
    this.router.events
      .pipe(
        takeUntil(this.onDestroy$),
        filter((event) => event instanceof NavigationEnd),
      )
      .subscribe(() => {
        this.routeParts = this.routePartsService.generateRouteParts(this.activeRoute.snapshot);
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
    this.core.register({ observerClass: this, eventName: 'PseudoRouteChange' }).pipe(
      takeUntil(this.onDestroy$),
    ).subscribe((evt: CoreEvent) => {
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
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}
