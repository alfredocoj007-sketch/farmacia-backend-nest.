import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Primer eslabón de la cadena de middlewares HTTP:
 * Asigna o propaga un identificador único (Correlation / Request ID)
 * a cada solicitud entrante para trazabilidad y auditoría.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const headerName = 'x-request-id';
    const requestId = (req.headers[headerName] as string) || randomUUID();

    req.headers[headerName] = requestId;
    res.setHeader('X-Request-Id', requestId);

    // Cede el control al siguiente eslabón en la cadena HTTP
    next();
  }
}
