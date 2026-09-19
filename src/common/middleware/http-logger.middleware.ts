import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Segundo eslabón de la cadena de middlewares HTTP:
 * Registra los tiempos de respuesta, método, ruta, IP y código HTTP
 * asociándolo al Request ID para la auditoría de operaciones de farmacia.
 */
@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const inicio = Date.now();
    const { method, originalUrl, ip } = req;
    const requestId = req.headers['x-request-id'] as string;

    res.on('finish', () => {
      const duracion = Date.now() - inicio;
      const { statusCode } = res;
      const mensaje = `[${requestId}] ${method} ${originalUrl} ${statusCode} - ${duracion}ms (IP: ${ip})`;

      if (statusCode >= 500) {
        this.logger.error(mensaje);
      } else if (statusCode >= 400) {
        this.logger.warn(mensaje);
      } else {
        this.logger.log(mensaje);
      }
    });

    // Pasa la solicitud al siguiente middleware, guard o controlador
    next();
  }
}
