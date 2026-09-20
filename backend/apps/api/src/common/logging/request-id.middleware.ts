import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

declare module 'express' {
  interface Request {
    requestId: string;
    rawBody?: Buffer;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header('x-request-id');
    req.requestId = incoming && incoming.length <= 128 ? incoming : `req_${nanoid(12)}`;
    res.setHeader('x-request-id', req.requestId);
    next();
  }
}
