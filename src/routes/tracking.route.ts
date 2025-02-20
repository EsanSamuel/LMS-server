import TrackingController from "../controllers/tracking.controller";
import express from "express";
const router = express.Router();

router.post(
  "/add-module-to-track/:userId/:moduleId",
  TrackingController.trackUserModules
);
router.get("/getTrackedModule/:id", TrackingController.getTrackModules);

export default router;
