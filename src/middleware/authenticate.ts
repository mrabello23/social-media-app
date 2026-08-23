import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";

declare module "express-serve-static-core" {
  interface Request {
    authenticatedUserId?: string;
  }
}

export function authenticate(jwtSecret: string): RequestHandler {
  return function authenticateRequest(req: Request, res: Response, next: NextFunction) {
    if (!jwtSecret) {
      return res.status(500).send({ success: false, message: "Authentication is not configured." });
    }

    const authorization = req.header("authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).send({ success: false, message: "Authentication is required." });
    }

    try {
      const token = authorization.slice("Bearer ".length);
      const payload = jwt.verify(token, jwtSecret);
      if (typeof payload === "string" || typeof payload.sub !== "string") {
        return res.status(401).send({ success: false, message: "Invalid authentication token." });
      }

      req.authenticatedUserId = payload.sub;
      return next();
    } catch {
      return res.status(401).send({ success: false, message: "Invalid authentication token." });
    }
  };
}
