import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Helper function to properly type Express route handlers
 * This resolves TypeScript errors with async route handlers
 * 
 * @param fn The async route handler function
 * @returns A properly typed Express request handler
 */
export const asyncHandler = <P = any, ResBody = any, ReqBody = any>(fn: (
  req: Request<P, ResBody, ReqBody>,
  res: Response<ResBody>,
  next: NextFunction
) => Promise<any>): RequestHandler<P, ResBody, ReqBody> => {
  return (req, res, next) => {
    Promise.resolve(fn(req as Request<P, ResBody, ReqBody>, res as Response<ResBody>, next))
      .catch(next);
  };
};
