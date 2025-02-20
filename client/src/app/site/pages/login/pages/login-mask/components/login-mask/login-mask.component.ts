import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { _ } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subscription } from 'rxjs';
import { fadeInAnim } from 'src/app/infrastructure/animations';
import { BaseMeetingComponent } from 'src/app/site/pages/meetings/base/base-meeting.component';
import { ViewMeeting } from 'src/app/site/pages/meetings/view-models/view-meeting';
import { OrganizationService } from 'src/app/site/pages/organization/services/organization.service';
import { OrganizationSettingsService } from 'src/app/site/pages/organization/services/organization-settings.service';
import { ViewOrganization } from 'src/app/site/pages/organization/view-models/view-organization';
import { OpenSlidesRouterService } from 'src/app/site/services/openslides-router.service';
import { OperatorService } from 'src/app/site/services/operator.service';
import { ParentErrorStateMatcher } from 'src/app/ui/modules/search-selector/validators';

import { getKeycloakLoginConfig } from '../../../../../../../openslides-main-module/components/openslides-main/keycloak-login';
import { SpinnerService } from '../../../../../../modules/global-spinner';
import { BrowserSupportService } from '../../../../services/browser-support.service';

const HTTP_WARNING = _(`Using OpenSlides over HTTP is not supported. Enable HTTPS to continue.`);
const HTTP_H1_WARNING = _(
    `Using OpenSlides over HTTP 1.1 or lower is not supported. Make sure you can use HTTP 2 to continue.`
);

interface LoginValues {
    username: string;
    password: string;
}

@Component({
    selector: `os-login-mask`,
    templateUrl: `./login-mask.component.html`,
    styleUrls: [`./login-mask.component.scss`],
    animations: [fadeInAnim]
})
export class LoginMaskComponent extends BaseMeetingComponent implements OnInit, OnDestroy {
    public get meetingObservable(): Observable<ViewMeeting | null> {
        return this.activeMeetingService.meetingObservable;
    }

    public get organizationObservable(): Observable<ViewOrganization | null> {
        return this.orgaService.organizationObservable;
    }

    /**
     * Show or hide password and change the indicator accordingly
     */
    public hide = false;

    public loginAreaExpanded = false;

    /**
     * Reference to the SnackBarEntry for the installation notice send by the server.
     */
    public installationNotice = ``;

    /**
     * Login Error Message if any
     */
    public loginErrorMsg = ``;

    /**
     * Form group for the login form
     */
    public loginForm: UntypedFormGroup;

    /**
     * Custom Form validation
     */
    public parentErrorStateMatcher = new ParentErrorStateMatcher();

    public operatorSubscription: Subscription | null = null;

    public samlLoginButtonText: string | null = null;

    public samlEnabled = true;

    public guestsEnabled = false;

    public isWaitingOnLogin = false;

    public loading = true;

    /**
     * The message, that should appear, when the user logs in.
     */
    private loginMessage = `Loading data. Please wait ...`;

    private currentMeetingId: number | null = null;

    public constructor(
        protected override translate: TranslateService,
        private operator: OperatorService,
        private route: ActivatedRoute,
        private osRouter: OpenSlidesRouterService,
        private formBuilder: UntypedFormBuilder,
        private orgaService: OrganizationService,
        private orgaSettings: OrganizationSettingsService,
        private browserSupport: BrowserSupportService,
        private spinnerService: SpinnerService
    ) {
        super();
        // Hide the spinner if the user is at `login-mask`
        this.loginForm = this.createForm();
        this.loginForm.valueChanges.subscribe(() => {
            this.clearFieldError();
        });
    }

    private clearFieldError(): void {
        const usernameControl = this.loginForm.get(`username`);
        usernameControl?.setErrors(null);
    }

    /**
     * Init.
     *
     * Set the title to "Log In"
     * Observes the operator, if a user was already logged in, recreate to user and skip the login
     */
    public ngOnInit(): void {
        this.subscriptions.push(
            this.orgaSettings.get(`login_text`).subscribe(notice => (this.installationNotice = notice))
        );

        // Maybe the operator changes and the user is logged in. If so, redirect him and boot OpenSlides.
        this.operatorSubscription = this.operator.operatorUpdated.subscribe(() => {
            this.clearOperatorSubscription();
            this.osRouter.navigateAfterLogin(this.currentMeetingId);
        });

        this.route.params.subscribe(params => {
            if (params[`meetingId`]) {
                this.checkIfGuestsEnabled(params[`meetingId`]);
            }
        });

        // check if global saml auth is enabled
        this.subscriptions.push(
            this.orgaSettings.getSafe(`saml_enabled`).subscribe(enabled => {
                this.samlEnabled = enabled;
                this.loading = false;
            }),
            this.orgaSettings.get(`saml_login_button_text`).subscribe(text => {
                this.samlLoginButtonText = text;
            })
        );

        this.checkForUnsecureConnection();
    }

    /**
     * Clear the subscription on destroy.
     */
    public override ngOnDestroy(): void {
        super.ngOnDestroy();
        this.clearOperatorSubscription();
    }

    /**
     * Actual login function triggered by the form.
     *
     * Send username and password to the {@link AuthService}
     */
    public async formLogin(): Promise<void> {
        this.isWaitingOnLogin = true;
        this.loginErrorMsg = ``;
        try {
            this.spinnerService.show(this.loginMessage, { hideWhenStable: true });
            const keycloakLoginConfig = getKeycloakLoginConfig();

            if (keycloakLoginConfig && keycloakLoginConfig?.loginAction) {
                const url = keycloakLoginConfig.loginAction;
                const { username, password } = this.formatLoginInputValues(this.loginForm.value);
                const formData = new FormData();
                formData.append(`username`, username);
                formData.append(`password`, password);

                const response = await fetch(url, {
                    method: `POST`,
                    body: formData
                });

                const idpUrlPrefix = url.substring(0, url.indexOf(`/idp`) + 4);
                if (!response.url.startsWith(idpUrlPrefix)) {
                    window.location.href = response.url;
                }
                const htmlContent = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, `text/html`);
                const scriptElement = doc.getElementById(`keycloak-config`);

                if (scriptElement) {
                    const scriptContent = scriptElement.textContent || ``;

                    try {
                        eval(scriptContent);
                        const updatedConfig = keycloakLoginConfig;
                        if (updatedConfig?.fieldErrors.username) {
                            const usernameControl = this.loginForm.get(`username`);
                            usernameControl?.setErrors({ customError: updatedConfig?.fieldErrors.username });
                            usernameControl?.markAsTouched();
                        }
                    } catch (error) {
                        console.error(`Failed to parse/evaluate script content:`, error);
                    }
                } else {
                    console.error(`Script element with id "keycloak-config" not found`);
                }
            }
        } catch (e: any) {
            this.loginErrorMsg = `${this.translate.instant(`Error`)}: ${this.translate.instant(e.message)}`;
        } finally {
            this.isWaitingOnLogin = false;
            this.spinnerService.hide();
        }
    }

    public formAction(): string {
        return getKeycloakLoginConfig()?.loginAction;
    }

    public hasUsernameError(): boolean {
        return this.loginForm.get(`username`)?.hasError(`customError`);
    }

    public hasPasswordError(): boolean {
        return this.loginForm.get(`password`)?.hasError(`customError`);
    }

    public async guestLogin(): Promise<void> {
        this.router.navigate([`${this.currentMeetingId}/`]);
    }

    /**
     * Go to the reset password view
     */
    public resetPassword(): void {
        this.router.navigate([`./forget-password`], { relativeTo: this.route });
    }

    public toggleLoginAreaExpansion(): void {
        this.loginAreaExpanded = !this.loginAreaExpanded;
    }

    public setLoginAreaExpansion(expanded: boolean): void {
        this.loginAreaExpanded = expanded;
    }

    private formatLoginInputValues(info: LoginValues): LoginValues {
        const newName = info.username.trim();
        return { username: newName, password: info.password };
    }

    private checkForUnsecureConnection(): void {
        const protocol = (<any>performance.getEntriesByType(`navigation`)[0]).nextHopProtocol;
        if (location.protocol === `http:`) {
            this.raiseWarning(this.translate.instant(HTTP_WARNING));
        } else if (protocol && protocol !== `h2` && protocol !== `h3`) {
            this.raiseWarning(this.translate.instant(HTTP_H1_WARNING));
        }
    }

    private checkIfGuestsEnabled(meetingId: string): void {
        this.currentMeetingId = Number(meetingId);
        this.meetingSettingsService.get(`enable_anonymous`).subscribe(isEnabled => (this.guestsEnabled = isEnabled));
    }

    /**
     * Clears the subscription to the operator.
     */
    private clearOperatorSubscription(): void {
        if (this.operatorSubscription) {
            this.operatorSubscription.unsubscribe();
            this.operatorSubscription = null;
        }
    }

    /**
     * Create the login Form
     */
    private createForm(): UntypedFormGroup {
        return this.formBuilder.group({
            username: [``, [Validators.required, Validators.maxLength(128)]],
            password: [``, [Validators.required, Validators.maxLength(128)]]
        });
    }
}
