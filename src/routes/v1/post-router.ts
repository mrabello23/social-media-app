import { NextFunction, Request, Response, Router } from "express";
import NodeCache from "node-cache";

import { database } from "../connection";
import PostRepositoryPostgreAdapter from "../../infra/adapters/PostRepositoryPostgreAdapter";
import QuoteRepositoryPostgreAdapter from "../../infra/adapters/QuoteRepositoryPostgreAdapter";
import PostController from "../../controllers/PostController";

const postRouterV1 = Router();
const cache = new NodeCache({ stdTTL: 10, checkperiod: 20 }); // Numbers in seconds

const controller = new PostController(
  new PostRepositoryPostgreAdapter(database),
  new QuoteRepositoryPostgreAdapter(database),
);

postRouterV1.post(
  "/v1/post/feed",
  // Set cache key
  (req: Request, res: Response, next: NextFunction) => {
    req.params.cacheKey = `post|homepage|${JSON.stringify({
      userId: req.body.userId,
      from: req.body.from,
      to: req.body.to,
    })}`;
    return next();
  },
  // Validate cache
  (req: Request, res: Response, next: NextFunction) => {
    if (cache.has(req.params.cacheKey)) {
      const cacheData = cache.get(req.params.cacheKey);
      console.log("cache", cacheData);

      return res.send({ success: true, message: "Ok Data cached", data: cacheData });
    }

    return next();
  },
  async (req: Request, res: Response) => {
    try {
      const returnData = await controller.getHomepage(req.body);

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

postRouterV1.post("/v1/post", async (req: Request, res: Response) => {
  try {
    if (!req.body.userId) {
      return res.status(400).send({ success: false, message: 'Param "userId" not found.' });
    }

    if (!req.body.text) {
      return res.status(400).send({ success: false, message: 'Param "text" not found.' });
    }

    await controller.doPost({ userId: req.body.userId, text: req.body.text });

    return res.send({ success: true, message: "Ok" });
  } catch (error) {
    let message = "Unknow error.";
    if (error instanceof Error) message = error.message;

    console.log(message);
    return res.status(500).send({ success: false, message });
  }
});

postRouterV1.post("/v1/repost", async (req: Request, res: Response) => {
  try {
    if (!req.body.userId) {
      return res.status(400).send({ success: false, message: 'Param "userId" not found.' });
    }

    if (!req.body.text) {
      return res.status(400).send({ success: false, message: 'Param "text" not found.' });
    }

    if (!req.body.originalPostId) {
      return res.status(400).send({ success: false, message: 'Param "originalPostId" not found.' });
    }

    await controller.doRepost({
      userId: req.body.userId,
      text: req.body.text,
      postId: req.body.originalPostId,
    });

    return res.send({ success: true, message: "Ok" });
  } catch (error) {
    let message = "Unknow error.";
    if (error instanceof Error) message = error.message;

    console.log(message);
    return res.status(500).send({ success: false, message });
  }
});

postRouterV1.post("/v1/quote-post", async (req: Request, res: Response) => {
  try {
    if (!req.body.userId) {
      return res.status(400).send({ success: false, message: 'Param "userId" not found.' });
    }

    if (!req.body.text) {
      return res.status(400).send({ success: false, message: 'Param "text" not found.' });
    }

    if (!req.body.originalPostId) {
      return res.status(400).send({ success: false, message: 'Param "originalPostId" not found.' });
    }

    await controller.doQuotePost({
      userId: req.body.userId,
      text: req.body.text,
      postId: req.body.originalPostId,
    });

    return res.send({ success: true, message: "Ok" });
  } catch (error) {
    let message = "Unknow error.";
    if (error instanceof Error) message = error.message;

    console.log(message);
    return res.status(500).send({ success: false, message });
  }
});

export { postRouterV1 };
