import CourseController from "../../controllers/room.controller";
import express from "express";
import multer from "multer";
import { requireAuth } from "@clerk/express";

// Configure multer storage
const storage = multer.memoryStorage(); // Stores file in memory as a buffer
const upload = multer({ storage });

// Middleware to handle file upload
const uploadSingle = upload.single("roomImage");

const router = express.Router();

router.post("/createRoom", uploadSingle, CourseController.createRoom);
router.get("/getRooms", CourseController.getCourseGroups);
router.get("/user-rooms/:id", CourseController.getUserCourseRoom);
router.get("/getRoom/:id", CourseController.getCourseGroupById);
router.patch(
  "/add_coverImage/:id",
  upload.single("coverImage"),
  CourseController.addCoverImage
);
router.patch("/editRoom/:id", uploadSingle, CourseController.editRoom);
router.delete("/delete-room/:id", CourseController.deleteRoom);
router.post("/addOrganizer", CourseController.addOrganizers);
router.get("/getRoomOrganizer/:id", CourseController.getRoomOrganizer);
router.post("/authorize-role", CourseController.authorizeRole);
router.delete("delete-organizer/id", CourseController.removeOrganizer);
router.post("/save-room/:userId/:roomId", CourseController.bookMarkRoom);
router.get("/get-saved-room/:id", CourseController.getBookMarkRoom);
router.get("/get-user-bookmarks/:id", CourseController.getUserBookmarks);
router.delete("/get-bookmark/:id", CourseController.deleteBookmark);

export default router;

//67a3aca776d4fac9522f57ea
