import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TreeModule } from '@circlon/angular-tree-component';
import { TranslateModule } from '@ngx-translate/core';
import { MarkdownModule } from 'ngx-markdown';
import { CommonDirectivesModule } from 'app/directives/common/common-directives.module';
import { IxCheckboxComponent } from 'app/modules/ix-forms/components/ix-checkbox/ix-checkbox.component';
import { IxChipsComponent } from 'app/modules/ix-forms/components/ix-chips/ix-chips.component';
import { IxComboboxComponent } from 'app/modules/ix-forms/components/ix-combobox/ix-combobox.component';
import { IxErrorsComponent } from 'app/modules/ix-forms/components/ix-errors/ix-errors.component';
import { IxExplorerComponent } from 'app/modules/ix-forms/components/ix-explorer/ix-explorer.component';
import { IxFieldsetComponent } from 'app/modules/ix-forms/components/ix-fieldset/ix-fieldset.component';
import { IxFileInputComponent } from 'app/modules/ix-forms/components/ix-file-input/ix-file-input.component';
import { IxInputComponent } from 'app/modules/ix-forms/components/ix-input/ix-input.component';
import { IxRadioGroupComponent } from 'app/modules/ix-forms/components/ix-radio-group/ix-radio-group.component';
import { IxSelectComponent } from 'app/modules/ix-forms/components/ix-select/ix-select.component';
import { IxModalHeaderComponent } from 'app/modules/ix-forms/components/ix-slide-in/components/ix-modal-header/ix-modal-header.component';
import { IxSlideInComponent } from 'app/modules/ix-forms/components/ix-slide-in/ix-slide-in.component';
import { IxSlideToggleComponent } from 'app/modules/ix-forms/components/ix-slide-toggle/ix-slide-toggle.component';
import { IxTextareaComponent } from 'app/modules/ix-forms/components/ix-textarea/ix-textarea.component';
import { IxFormatterService } from 'app/modules/ix-forms/services/ix-formatter.service';
import IxValidatorsService from 'app/modules/ix-forms/services/ix-validators.service';
import { TooltipModule } from 'app/modules/tooltip/tooltip.module';
import { EnclosureModule } from 'app/pages/system/view-enclosure/enclosure.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MarkdownModule.forRoot(),
    FlexLayoutModule,
    EnclosureModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatRadioModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatCheckboxModule,
    CommonDirectivesModule,
    TooltipModule,
    TranslateModule,
    TreeModule,
  ],
  declarations: [
    IxInputComponent,
    IxErrorsComponent,
    IxSelectComponent,
    IxFieldsetComponent,
    IxSlideInComponent,
    IxModalHeaderComponent,
    IxCheckboxComponent,
    IxTextareaComponent,
    IxComboboxComponent,
    IxChipsComponent,
    IxExplorerComponent,
    IxFileInputComponent,
    IxSlideToggleComponent,
    IxRadioGroupComponent,
  ],
  exports: [
    IxErrorsComponent,
    IxInputComponent,
    IxSelectComponent,
    IxSlideInComponent,
    IxModalHeaderComponent,
    IxFieldsetComponent,
    IxCheckboxComponent,
    IxTextareaComponent,
    IxChipsComponent,
    IxComboboxComponent,
    IxExplorerComponent,
    IxFileInputComponent,
    IxSlideToggleComponent,
    IxRadioGroupComponent,
  ],
  providers: [
    IxFormatterService,
    IxValidatorsService,
  ],
})
export class IxFormsModule {}
