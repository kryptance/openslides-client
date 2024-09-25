import {Injectable} from '@angular/core';

import {MediaManageService} from './media-manage.service';
import {AuthTokenService} from "../../../services/auth-token.service";
import { HttpService } from 'src/app/gateways/http.service';

/**
 * The linter refuses to allow Document['fonts'].
 * Since Document.fonts is working draft since 2016, typescript
 * dies not yet support it natively (even though it exists in normal browsers)
 */
interface FontDocument extends Document {
    fonts: any;
}

/**
 * Service to dynamically load and sets custom loaded fonts
 * using FontFace.
 * Browser support might not be perfect yet.
 */
@Injectable({
    providedIn: `root`
})
export class LoadFontService {
    private accessToken: string | null = null;

    public constructor(private mediaManageService: MediaManageService,
                       private authTokenService: AuthTokenService,
                       private httpService: HttpService) {
        this.authTokenService.accessTokenObservable.subscribe(token => {
            if (token) {
                console.log(`Access token: ${token.rawAccessToken}`);
                this.accessToken = token.rawAccessToken;
            }
        });
        this.loadCustomFont();
    }

    /**
     * Observes and loads custom fonts for the projector.
     * Currently, normal and regular fonts can be considered, since
     * italic fonts can easily be calculated by the browser.
     * Falls back to the normal OSFont when no custom  font was set.
     */
    private loadCustomFont(): void {
        this.mediaManageService.getFontUrlObservable(`regular`).subscribe(regular => {
            if (regular) {
                this.setCustomProjectorFont(regular, 400);
            }
        });

        this.mediaManageService.getFontUrlObservable(`bold`).subscribe(bold => {
            if (bold) {
                this.setCustomProjectorFont(bold, 500);
            }
        });

        this.mediaManageService.getFontUrlObservable(`monospace`).subscribe(mono => {
            if (mono) {
                this.setNewFontFace(`OSFont Monospace`, mono);
            }
        });

        this.mediaManageService.getFontUrlObservable(`chyron_speaker_name`).subscribe(chyronFont => {
            if (chyronFont) {
                this.setNewFontFace(`customChyronNameFont`, chyronFont);
            }
        });

        this.mediaManageService.getFontUrlObservable(`projector_h1`).subscribe(projectorH1 => {
            if (projectorH1) {
                this.setNewFontFace(`OSFont projectorH1`, projectorH1);
            }
        });

        this.mediaManageService.getFontUrlObservable(`projector_h2`).subscribe(projectorH2 => {
            if (projectorH2) {
                this.setNewFontFace(`OSFont projectorH2`, projectorH2);
            }
        });
    }

    /**
     * Sets a new font for the custom projector. Weight is required to
     * differentiate between bold and normal fonts
     *
     * @param fonturl the font object from the config service
     * @param weight the desired weight of the font
     */
    private setCustomProjectorFont(fonturl: string, weight: number): void {
        if (!fonturl) {
            return;
        }
        this.setNewFontFace(`customProjectorFont`, fonturl, weight);
    }

    private async loadFont(url: string, fontName: string, descriptors:  FontFaceDescriptors) {
        const fontUrl = await this.httpService.getBlobUrl(url);
        const fontFace = new FontFace(fontName, `url(${fontUrl})`, descriptors);

        // Load and add the font to the document
        return await fontFace.load();
    };


    private setNewFontFace(fontName: string, fontPath: string, weight = 400): void {
        this.loadFont(fontPath, fontName, {weight: `${weight}`})
            .then((res: any) => {
                (document as FontDocument).fonts.add(res);
            })
            .catch((error: any) => {
                console.error(`Error setting font "${fontName}" with path "${fontPath}" :: `, error);
            });
    }
}
