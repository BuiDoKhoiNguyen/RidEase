require("dotenv").config();
import express, {NextFunction, Request, Response} from "express";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.route";
import Nylas from "nylas";

export const app = express();

export const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!
});

console.log(process.env.NYLAS_API_KEY);

app.use(express.json({ limit: "50mb" }));

app.use(cookieParser());

app.use("/api/v1", userRouter)

app.get("/test", (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
      success: true,
      message: "API is working",
    });
  });
  