import express from "express";
import {
  getAllRides,
  getDriverPushToken,
  getDriversById,
  getLoggedInDriverData,
  newRide,
  savePushToken,
  sendingOtpToPhone,
  setDriverNotificationToken,
  updateDriverStatus,
  updatingRideStatus,
  verifyingEmailOtp,
  verifyPhoneOtpForLogin,
  verifyPhoneOtpForRegistration,
} from "../controllers/driver.controller";
import { isAuthenticatedDriver } from "../middleware/isAuthenticated";

const driverRouter = express.Router();

driverRouter.post("/send-otp", sendingOtpToPhone);

driverRouter.post("/login", verifyPhoneOtpForLogin);

driverRouter.post("/verify-otp", verifyPhoneOtpForRegistration);

driverRouter.post("/registration-driver", verifyingEmailOtp);

driverRouter.get("/me", isAuthenticatedDriver, getLoggedInDriverData);

driverRouter.get("/get-drivers-data", getDriversById);

driverRouter.put("/update-status", isAuthenticatedDriver, updateDriverStatus);

driverRouter.post("/new-ride", isAuthenticatedDriver, newRide);

driverRouter.put(
  "/update-ride-status",
  isAuthenticatedDriver,
  updatingRideStatus
);

driverRouter.get("/get-rides", isAuthenticatedDriver, getAllRides);

// Push notification routes
driverRouter.post("/save-push-token", isAuthenticatedDriver, savePushToken);
driverRouter.get("/get-push-token/:id", getDriverPushToken);

// NEW: Manual token update endpoint (no auth required for testing purposes)
driverRouter.post("/set-notification-token", setDriverNotificationToken);

export default driverRouter;
