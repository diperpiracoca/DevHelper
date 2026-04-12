import { inject } from '@angular/core';
import { RedirectCommand, Router, Routes } from '@angular/router';
import { Authenticator } from './shared/service/authenticator';
import { routesAuth } from './auth';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./home/components/home/home').then((c) => c),
        canActivate: [
            async () => {
                const router = inject(Router);
                const authenticator = inject(Authenticator);
                const user = await authenticator.userPromise();
                if (!user) {
                    const loginPath = router.parseUrl("/login");
                    return new RedirectCommand(loginPath);
                }
                return true;
            },
        ],

    },
    ...routesAuth
];
