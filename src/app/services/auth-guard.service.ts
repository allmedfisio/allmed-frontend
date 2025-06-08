import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuardService implements CanActivate {
  constructor(private router: Router, private authService: AuthService) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Controllo se esiste il token
    if (!this.authService.isAuthenticated) {
      this.router.navigate(['/login']);
      return false;
    }

    // Se sulla route è specificato un array di ruoli, lo leggo da route.data['roles']
    const allowedRoles = route.data['roles'] as string[] | undefined;
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = this.authService.currentRole;
      if (!userRole || !allowedRoles.includes(userRole)) {
        // Non ho i permessi → torno al login o a una pagina di “Forbidden”
        this.router.navigate(['/login']);
        return false;
      }
    }

    // Se arrivo fin qui, sono autenticato e (se necessario) ho il ruolo giusto
    return true;
  }
}
