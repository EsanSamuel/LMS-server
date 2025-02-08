import UserController from "../controllers/user.controller";
import express from "express";
import multer from "multer";
import { requireAuth } from "@clerk/express";

// Configure multer storage
const storage = multer.memoryStorage(); // Stores file in memory as a buffer
const upload = multer({ storage });

// Middleware to handle file upload
const uploadSingle = upload.single("profileImage");

const router = express.Router();

router.post("/create-user", UserController.createUser);
router.get("/create-user", (req: express.Request, res: express.Response) => {
  res.send("User route");
});
router.get("/getusers", UserController.getUsers);
router.get("/getUser/:id", UserController.getUser);
router.patch("/editUser/:id", uploadSingle, UserController.editProfile);
router.delete("/delete-user/:id", UserController.deleteUser);

export default router;
