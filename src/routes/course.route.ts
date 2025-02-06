import CourseController from "../controllers/course.controller";
import UserController from "../controllers/user.controller";
import express from "express";
import multer from "multer";

// Configure multer storage
const storage = multer.memoryStorage(); // Stores file in memory as a buffer
const upload = multer({ storage });

const router = express.Router();

router.post(
  "/create-course",
  upload.fields([
    { name: "thumbnailUrl", maxCount: 1 },
    { name: "videoUrls", maxCount: 10 },
    { name: "imageUrls", maxCount: 10 },
  ]),
  CourseController.createCourse
);
router.get("/getCourses/:id", CourseController.getCourses);
router.get("/getCourse/:id", CourseController.getCourseById);

export default router;
