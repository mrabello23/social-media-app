import { NextFunction, Request, Response } from "express";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const invalid = (res: Response, message: string) => res.status(400).send({ success: false, message });

export function validatePostRequest(req: Request, res: Response, next: NextFunction) {
  if (typeof req.body.text !== "string" || !req.body.text.trim()) {
    return invalid(res, 'Param "text" must be a non-empty string.');
  }

  if (req.body.text.length > 777) {
    return invalid(res, 'Param "text" cannot exceed 777 characters.');
  }

  if (req.body.userId !== undefined && typeof req.body.userId !== "string") {
    return invalid(res, 'Param "userId" must be a string.');
  }

  return next();
}

export function validateReferencedPostRequest(req: Request, res: Response, next: NextFunction) {
  const result = validatePostRequest(req, res, () => undefined);
  if (result) return result;

  if (typeof req.body.originalPostId !== "string" || !UUID_PATTERN.test(req.body.originalPostId)) {
    return invalid(res, 'Param "originalPostId" must be a valid UUID.');
  }

  return next();
}

export function validateFeedRequest(req: Request, res: Response, next: NextFunction) {
  if (req.body.userId !== undefined && typeof req.body.userId !== "string") {
    return invalid(res, 'Param "userId" must be a string.');
  }

  if (req.body.from !== undefined && typeof req.body.from !== "string") {
    return invalid(res, 'Param "from" must be a string.');
  }

  if (req.body.to !== undefined && typeof req.body.to !== "string") {
    return invalid(res, 'Param "to" must be a string.');
  }

  return next();
}

export function validateLoginRequest(req: Request, res: Response, next: NextFunction) {
  if (typeof req.body.email !== "string" || !req.body.email.trim()) {
    return invalid(res, 'Param "email" must be a non-empty string.');
  }

  if (typeof req.body.password !== "string" || !req.body.password) {
    return invalid(res, 'Param "password" must be a non-empty string.');
  }

  return next();
}
