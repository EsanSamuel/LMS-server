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
  //create course
  static async createCourse(req: express.Request, res: express.Response) {
    try {
      const validate = validateContent.parse(await req.body);
      const { title, textContent, userId, roomId, status }: contentType =
        validate;
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
          status: status,
        },
      });

      console.log(create_course);

      res
        .status(201)
        .json(new ApiSuccess(201, "Course created🟢🟢!", create_course));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  //get courses
  static async getCourses(req: express.Request, res: express.Response) {
    try {
      const id = req.params.id;
      const cachedkey = `courses:${id}`;
      const cachedCourses = await redis.get(cachedkey);
      if (cachedCourses) {
        console.log("Cached courses:", cachedCourses);
        res
          .status(201)
          .json(
            new ApiSuccess(
              200,
              "Course gotten from cache🟢🟢!",
              JSON.parse(cachedCourses)
            )
          );
      } else {
        console.log("No cached courses found. Fetching from database...");

        const courses = await prisma.content.findMany({
          where: {
            roomId: id,
          },
          include: {
            creator: true,
            room: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        console.log(courses);

        const getPublicCourses = courses.filter(
          (course) => course.status === "public" || course.status !== "private"
        );
        await redis.setex(cachedkey, 600, JSON.stringify(getPublicCourses));
        res
          .status(201)
          .json(new ApiSuccess(201, "Course goten🟢🟢!", getPublicCourses));
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  //get course by id
  static async getCourseById(req: express.Request, res: express.Response) {
    try {
      const id = req.params.id;
      const cachedkey = `course:${id}`;
      const cachedCourse = await redis.get(cachedkey);
      if (cachedCourse) {
        console.log("Cached course:", cachedCourse);
        res
          .status(201)
          .json(
            new ApiSuccess(
              200,
              "Course goten from cache🟢🟢!",
              JSON.parse(cachedCourse)
            )
          );
      } else {
        console.log("No cached courses found. Fetching from database...");

        const course = await prisma.content.findUnique({
          where: {
            id: id,
          },
          include: {
            creator: true,
            room: true,
          },
        });
        console.log(course);
        await redis.setex(cachedkey, 600, JSON.stringify(course));
        res.status(201).json(new ApiSuccess(201, "Course goten🟢🟢!", course));
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  //get courses created by user
  static async getUserCourses(req: express.Request, res: express.Response) {
    try {
      const id = req.params.id;
      const cachedkey = `courses:${id}`;
      const cachedCourses = await redis.get(cachedkey);
      if (cachedCourses) {
        console.log("Cached courses:", cachedCourses);
        res
          .status(201)
          .json(
            new ApiSuccess(
              200,
              "UservCourse gotten from cache🟢🟢!",
              JSON.parse(cachedCourses)
            )
          );
      } else {
        console.log("No cached courses found. Fetching from database...");

        const courses = await prisma.content.findMany({
          where: {
            userId: id,
          },
          include: {
            creator: true,
            room: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        console.log(courses);

        await redis.setex(cachedkey, 600, JSON.stringify(courses));
        res.status(201).json(new ApiSuccess(201, "Course goten🟢🟢!", courses));
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }
}

export default CourseController;
