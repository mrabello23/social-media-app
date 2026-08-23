import { Request, Response, Router } from "express";

import { JWT_SECRET } from "../../envs";
import AuthController from "../../controllers/AuthController";
import UserRepositoryPostgreAdapter from "../../infra/adapters/UserRepositoryPostgreAdapter";
import UserRepository from "../../infra/repositories/UserRepository";
import { database } from "../connection";
import { validateLoginRequest } from "../../middleware/validateRequest";

const createAuthRouter = (
  jwtSecret: string,
  userRepository: UserRepository = new UserRepositoryPostgreAdapter(database),
) => {
  const authRouter = Router();
  const controller = new AuthController(userRepository, jwtSecret);

  authRouter.post("/v1/auth/login", validateLoginRequest, async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (typeof email !== "string" || !email || typeof password !== "string" || !password) {
      return res.status(400).send({
        success: false,
        message: 'Params "email" and "password" are required.',
      });
    }

    try {
      const data = await controller.login({ email, password });
      return res.send({ success: true, message: "Ok", data });
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid credentials.") {
        return res.status(401).send({ success: false, message: error.message });
      }

      return res.status(500).send({ success: false, message: "Unable to authenticate." });
    }
  });

  return authRouter;
};

const authRouter = createAuthRouter(JWT_SECRET);

export { authRouter, createAuthRouter };
