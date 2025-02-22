import TrackingController from "../../controllers/tracking.controller";
import express from "express";

const router = express.Router();

router.post("/trackModule/:id", TrackingController.trackUserModules);
router.get("/getTrackedModule/:id", TrackingController.getTrackModules);
router.post("/trackCourse/:id", TrackingController.trackCourses);
router.get("/getTrackedCourse/:id", TrackingController.getTrackCourses);

export default router;
