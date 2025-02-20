import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';

import { AuthToken } from '../../domain/interfaces/auth-token';

@Injectable({
    providedIn: `root`
})
export class AuthTokenService {
    public get rawAccessToken(): string | null {
        return this._rawAccessToken;
    }

    public get accessTokenObservable(): Observable<AuthToken | null> {
        return this._accessTokenSubject;
    }

    public get accessToken(): AuthToken | null {
        return this._accessTokenSubject.getValue();
    }

    // Use undefined as the state of not being initialized
    private _accessTokenSubject = new BehaviorSubject<AuthToken | null>(null);
    private _rawAccessToken: string | null = null;

    public setRawAccessToken(rawToken: string | null): void {
        this._rawAccessToken = rawToken;
        const token = this.parseToken(rawToken);
        this._accessTokenSubject.next(token);
    }

    public async waitForValidToken(): Promise<void> {
        await firstValueFrom(this._accessTokenSubject);
    }

    private parseToken(rawToken: string | null): AuthToken | null {
        if (!rawToken) {
            return null;
        }

        try {
            const payload = atob(rawToken.split(`.`)[1]);
            const parsedToken = JSON.parse(payload) as AuthToken;
            parsedToken.rawAccessToken = rawToken;
            parsedToken.userId = parsedToken[`os_uid`];
            return parsedToken;
        } catch (e) {
            return null;
        }
    }
}
