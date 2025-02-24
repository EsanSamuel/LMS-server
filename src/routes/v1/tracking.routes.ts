import TrackingController from "../../controllers/tracking.controller";
import express from "express";

const router = express.Router();

router.post("/trackModule/:id", TrackingController.trackUserModules);
router.get("/getTrackedModule/:id", TrackingController.getTrackModules);
router.post("/trackCourse/:id", TrackingController.trackCourses);
router.get("/getTrackedCourse/:id", TrackingController.getTrackCourses);
router.post("/trackRoom/:id", TrackingController.trackRooms);
router.get("/getTrackedRoom/:id", TrackingController.getTrackRooms);
router.post("/trackQuiz/:id", TrackingController.trackUserQuiz);
router.get("/getTrackedQuiz/:id", TrackingController.getTrackQuiz);

export default router;
