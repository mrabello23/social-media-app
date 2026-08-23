import express, { Request, Response } from "express";
import compression from "compression";

import { userRouterV1, postRouterV1 } from "./routes";

const app = express();

app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(compression());

app.use(userRouterV1);
app.use(postRouterV1);

app.get("/", (req: Request, res: Response) => {
  console.log("Server Up and Running.");
  res.send({ status: "Ok", message: "Server is Up and Running!" });
});

export default app;
