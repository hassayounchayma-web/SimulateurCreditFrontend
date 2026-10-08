import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();
    let request = req;

    if (token) {
      request = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(request).pipe(
      catchError((err: HttpErrorResponse) => {
        console.error('HTTP error', err.status, req.url, err.error);

        // Pendant le debug history/amortissement, tu peux commenter le bloc logout
        if (
          err.status === 401 &&
          this.auth.getToken() &&
          !req.url.includes('/api/auth/')
        ) {
          this.auth.logout();
          this.router.navigate(['/login']);
        }

        return throwError(() => err);
      })
    );
  }
}
