import { NextFunction, Request, Response, Router } from "express";
import NodeCache from "node-cache";

import { database } from "../connection";
import UserController from "../../controllers/UserController";
import PostRepositoryPostgreAdapter from "../../infra/adapters/PostRepositoryPostgreAdapter";
import UserRepositoryPostgreAdapter from "../../infra/adapters/UserRepositoryPostgreAdapter";
import QuoteRepositoryPostgreAdapter from "../../infra/adapters/QuoteRepositoryPostgreAdapter";

const userRouterV1 = Router();
const controller = new UserController(
  new PostRepositoryPostgreAdapter(database),
  new UserRepositoryPostgreAdapter(database),
  new QuoteRepositoryPostgreAdapter(database),
);

const cache = new NodeCache({ stdTTL: 10, checkperiod: 20 }); // Numbers in seconds

const validateCache = (req: Request, res: Response, next: NextFunction) => {
  if (cache.has(req.params.cacheKey)) {
    const cacheData = cache.get(req.params.cacheKey);
    console.log("cache", cacheData);

    return res.send({ success: true, message: "Ok Data cached", data: cacheData });
  }

  return next();
};

userRouterV1.post(
  "/v1/user/profile",
  (req: Request, res: Response, next: NextFunction) => {
    req.params.cacheKey = `user|profile|${req.body.userId}`;
    return next();
  },
  validateCache,
  async (req: Request, res: Response) => {
    try {
      if (!req.body.userId) {
        return res.status(400).send({ success: false, message: 'Param "userId" not found.' });
      }

      const returnData = await controller.getUserProfile(req.body.userId);
      cache.set(req.params.cacheKey, returnData);

      return res.send({ success: true, message: "Ok", data: returnData });
    } catch (error) {
      let message = "Unknow error.";
      if (error instanceof Error) message = error.message;

      console.log(message);
      return res.status(500).send({ success: false, message });
    }
  },
);

userRouterV1.get(
  "/v1/user/:username",
  (req: Request, res: Response, next: NextFunction) => {
    req.params.cacheKey = `user|usename|${req.params.username}`;
    return next();
  },
  validateCache,
  async (req: Request, res: Response) => {
    try {
      if (!req.params.username) {
        return res.status(400).send({ success: false, message: 'Param "username" not found.' });
      }

      const user = await controller.getUserData(req.params.username);
      cache.set(req.params.cacheKey, user);

      return res.send({ success: true, message: "Ok", data: user });
    } catch (error) {
      let message = "Unknow error.";
      if (error instanceof Error) message = error.message;

      console.log(message);
      return res.status(500).send({ success: false, message });
    }
  },
);

export { userRouterV1 };
