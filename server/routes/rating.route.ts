import express from "express";
import { getDriverRatings, rateDriver } from "../controllers/rating.controller";
import { isAuthenticated } from "../middleware/isAuthenticated";

const ratingRouter = express.Router();

ratingRouter.post("/rate-driver", isAuthenticated, rateDriver);
ratingRouter.get("/driver/:driverId", getDriverRatings);

export default ratingRouter;
