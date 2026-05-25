import { app } from "./app";
import { authMiddleware } from "./middlewares/auth.middleware";
import dotenv from "dotenv";

dotenv.config();

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

app.get("/me", authMiddleware, async (request, response) => {
  return response.json({ user: request.user });
}
);