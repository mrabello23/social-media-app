import express, { Request, Response } from "express";
import compression from "compression";

import { JWT_SECRET } from "./envs";
import UserRepository from "./infra/repositories/UserRepository";
import { authenticate } from "./middleware/authenticate";
import { createAuthRouter, userRouterV1, postRouterV1 } from "./routes";

export const createApp = (jwtSecret: string, userRepository?: UserRepository) => {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(compression());

  app.get("/", (req: Request, res: Response) => {
    console.log("Server Up and Running.");
    res.send({ status: "Ok", message: "Server is Up and Running!" });
  });

  app.use(createAuthRouter(jwtSecret, userRepository));
  app.use(authenticate(jwtSecret));
  app.use(userRouterV1);
  app.use(postRouterV1);

  return app;
};

const app = createApp(JWT_SECRET);
export default app;
