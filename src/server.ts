import { JWT_SECRET, PORT } from "./envs";
import app from "./app";

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters.");
}

app.listen(PORT);
