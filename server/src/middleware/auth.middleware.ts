import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.sendStatus(403);
      }

      (req as any).user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (user && roles.includes(user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Unauthorized role' });
    }
  };
};
