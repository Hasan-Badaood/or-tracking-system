import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function encryptResponse(req: Request, res: Response, next: NextFunction) {
  const enabled = process.env.ENCRYPT_RESPONSES === 'true';
  const keyHex = process.env.API_ENCRYPTION_KEY ?? '';

  if (!enabled || process.env.NODE_ENV === 'test' || !keyHex) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const plaintext = JSON.stringify(body);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return originalJson({
      iv: iv.toString('base64'),
      data: encrypted.toString('base64'),
      tag: tag.toString('base64'),
    });
  };

  next();
}
