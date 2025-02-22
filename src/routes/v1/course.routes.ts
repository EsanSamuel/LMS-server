import { getAuth } from "@clerk/express";
import CourseController from "../../controllers/course.controller";
import UserController from "../../controllers/user.controller";
import express from "express";
import multer from "multer";
import { requireAuth } from "@clerk/express";

// Configure multer storage
const storage = multer.memoryStorage(); // Stores file in memory as a buffer
const upload = multer({ storage });

const router = express.Router();

router.post("/create-course-module", CourseController.createCourseModule);
router.get("/get-allmodules/:id", CourseController.getCourseModules);
router.get("/get-module/:id", CourseController.getCourseModuleById);
router.patch("/edit-module/:id", CourseController.editCourseModule);
router.delete("/delete-module/:id", CourseController.deleteCourseModule);
router.post(
  "/create-course",
  upload.fields([
    { name: "thumbnailUrl", maxCount: 1 },
    { name: "videoUrls", maxCount: 10 },
    { name: "imageUrls", maxCount: 10 },
    { name: "pdfUrls", maxCount: 10 },
  ]),
  CourseController.createCourse
);
router.get("/getCourses/:id", CourseController.getCourses);
router.get("/getCourse/:id", CourseController.getCourseById);
router.delete("/delete-course/:id", CourseController.deleteCourse);
router.post("/create-comment", CourseController.createComment);
router.get("/get-allcomments:/id", CourseController.getComments);
router.get("/get-comment:/id", CourseController.getCommentById);
router.delete("/delete-comment/:id", CourseController.deleteComment);
router.post("/create-quiz", CourseController.createQuiz);
router.patch("/edit-quiz/:id", CourseController.editQuiz);
router.get("/get-quiz/:id", CourseController.getQuiz);
router.delete("/delete-quiz/:id", CourseController.deleteQuiz);
router.post("/check-quizAnswer/:id", CourseController.checkAnswer);
router.post("/grade-quiz/:quizId", CourseController.gradeQuiz as any);
router.get("/getUserAnswer/:id", CourseController.getUserAnswer);
router.delete("/delete-answers/:id", CourseController.deleteAnswers);
router.post("/like-course/:id", CourseController.likeCourse);
router.post("/get-likes", CourseController.getLikes);

export default router;
