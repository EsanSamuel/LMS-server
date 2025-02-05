import express from "express";
import Redis from "ioredis";
import {
  contentType,
  organizerType,
  roomType,
  userType,
  validateContent,
  validateOrganizer,
  validateRoom,
  validateUser,
} from "../libs/validation";
import prisma from "../libs/prismadb";
import { ApiError, ApiSuccess } from "../utils/ApiResponse";
import { CourseRoom, User } from "@prisma/client";
import sharp from "sharp";
import cloudinary from "../utils/cloudinary";
import { connect } from "http2";

interface MulterfileInterface {
  thumbnailUrl: Express.Multer.File[];
  videoUrls: Express.Multer.File[];
  imageUrls: Express.Multer.File[];
  pdf: Express.Multer.File[];
}

const redis = new Redis();

class CourseController {
  static async createCourse(req: express.Request, res: express.Response) {
    try {
      const validate = validateContent.parse(await req.body);
      const { title, textContent, userId, roomId }: contentType = validate;
      const { thumbnailUrl, videoUrls, imageUrls } = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      const processedImage = async (file: Express.Multer.File) => {
        const imageBuffer = file.buffer;

        const resizeImage = await sharp(imageBuffer)
          .resize(500, 500)
          .toFormat("png")
          .toBuffer();

        const base64image = resizeImage.toString("base64");
        const roomImage = `data:image/png;base64,${base64image}`;

        const uploadImage = await cloudinary.uploader.upload(roomImage);
        return uploadImage.url;
      };

      const processedVideo = async (file: Express.Multer.File) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: "video", // Specify resource type as 'video'
              folder: "videos", // Optional: Store videos in a specific folder on Cloudinary
              format: "mp4",
              timeout: 600000, // Optional: Ensure Cloudinary processes the video in the desired format
            },
            (error, result) => {
              if (error) {
                console.error("Cloudinary Video Upload Error:", error);
                reject("Video upload failed");
              } else {
                resolve(result?.secure_url); // Resolve the URL of the uploaded video
              }
            }
          );

          if (!file.buffer) {
            console.error("File buffer is empty!");
            reject("File buffer is empty!");
            return;
          }

          // Send the video buffer to Cloudinary
          uploadStream.end(file.buffer);
        });
      };

      // Process thumbnail image (single)
      const thumbnail = thumbnailUrl?.length
        ? await processedImage(thumbnailUrl[0])
        : null;
      console.log("Thumbnail URL:", thumbnail);

      // Process videos and images (multiple)
      const videos = videoUrls?.length
        ? await Promise.all(videoUrls.map((file) => processedVideo(file)))
        : [];
      console.log("Video URLs:", videos);

      const images = imageUrls?.length
        ? await Promise.all(imageUrls.map((file) => processedImage(file)))
        : [];
      console.log("Image URLs:", images);

      const create_course = await prisma.content.create({
        data: {
          creator: {
            connect: {
              clerkId: userId,
            },
          },
          room: {
            connect: {
              id: roomId,
            },
          },
          title,
          textContent,
          thumbnailUrl: thumbnail,
          videoUrls: videos as string[],
          imageUrls: images,
        },
      });

      console.log(create_course);

      res
        .status(201)
        .json(new ApiSuccess(201, "Course created!", create_course));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }
}

export default CourseController;
