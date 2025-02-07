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
router.post("/create-comment", CourseController.createComment);
router.get("/get-allcomments:/id", CourseController.getComments);
router.get("/get-comment:/id", CourseController.getCommentById);
router.post("/create-quiz", CourseController.createQuiz);
router.get("/get-quiz/:id", CourseController.getQuiz);
router.post("/check-quizAnswer", CourseController.checkAnswer);
router.post("/grade-quiz/:quizId", CourseController.gradeQuiz);

export default router;
