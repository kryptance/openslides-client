import { Id } from '../domain/definitions/key-types';
import { WorkerHttpAuth } from './http/auth';
import { Broadcaster } from './interfaces';
import { AuthMessage } from './sw-auth.interfaces';

export function initAuthWorker(broadcast: Broadcaster): void {
    WorkerHttpAuth.subscribe(`auth`, (token, uid?) => onAuthUpdate(token, uid));

    function onAuthUpdate(token: string, userId?: Id): void {
        if (userId !== undefined) {
            broadcast(`auth`, `new-user`, {
                user: userId,
                token
            });
        } else {
            broadcast(`auth`, `new-token`, {
                user: userId,
                token
            });
        }
    }
}

export function authMessageHandler(ctx: any, e: MessageEvent<AuthMessage>): void {
    const msg = e.data.msg;
    switch (msg.action) {
        case `update`:
            WorkerHttpAuth.update(msg.params);
            break;
        case `auth-error`:
            WorkerHttpAuth.authError(msg.params.reason);
            break;
    }
}
