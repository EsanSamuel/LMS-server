import express from "express";
import Redis from "ioredis";
import {
  organizerType,
  roomType,
  userType,
  validateOrganizer,
  validateRoom,
  validateUser,
} from "../libs/validation";
import prisma from "../libs/prismadb";
import { ApiError, ApiSuccess } from "../utils/ApiResponse";
import { CourseRoom, User } from "@prisma/client";
import sharp from "sharp";
import cloudinary from "../utils/cloudinary";

const redis = new Redis();

const makeCouseRoomsRandom = <T>(arr: T[]): T[] => {
  const shuffledArr = [...arr];
  for (let i = shuffledArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArr[i], shuffledArr[j]] = [shuffledArr[j], shuffledArr[i]];
  }
  return shuffledArr;
};

class CourseController {
  //create room/group
  static async createRoom(req: express.Request, res: express.Response) {
    try {
      const validate = validateRoom.parse(await req.body);
      const { roomName, roomDescription, category, clerkId, status }: roomType =
        validate;

      let roomImageUrl: string | null = null;

      if (req.file) {
        const roomImageBuffer = req.file.buffer;

        const resizeImage = await sharp(roomImageBuffer)
          .resize({ width: 800 }) // Resize (optional)
          .sharpen() // Sharpen the image
          .toFormat("png")
          .toBuffer();

        const base64image = resizeImage.toString("base64");
        const roomImage = `data:image/png;base64,${base64image}`;

        const ImageUrl = await cloudinary.uploader.upload(roomImage);
        roomImageUrl = ImageUrl.url;
      }

      const courseRoom = await prisma.courseRoom.create({
        data: {
          creator: {
            connect: {
              clerkId: clerkId,
            },
          },
          roomName,
          roomDescription,
          category,
          roomImage: roomImageUrl,
          status: status,
        },
      });
      console.log(courseRoom);
      await redis.del("courseRooms");
      res
        .status(201)
        .json(new ApiSuccess(201, "Group created successfully!", courseRoom));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  //get rooms
  static async getCourseGroups(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const cachedKey = "courseRooms";
      const cachedGroups = await redis.get(cachedKey);
      if (cachedGroups) {
        console.log(`Course rooms fetched from cache!`, cachedGroups);
        res
          .status(200)
          .json(
            new ApiSuccess(
              200,
              "Course room gotten from cache successfully",
              JSON.parse(cachedGroups)
            )
          );
      } else {
        console.log("No cached room found. Fetching from database...");

        const groups = await prisma.courseRoom.findMany({
          orderBy: {
            createdAt: "desc",
          },
          include: {
            creator: true,
            Module: true,
          },
        });

        console.log(groups);

        //get only public groups
        const getPublicGroups = groups.filter(
          (group) => group.status === "public" || group.status !== "private"
        );
        const randGroups = makeCouseRoomsRandom(Array.from(getPublicGroups));
        console.log("Random groups:", randGroups);
        await redis.setex(cachedKey, 600, JSON.stringify(randGroups));
        res
          .status(200)
          .json(new ApiSuccess(200, "Course rooms/groups gotten!", randGroups));
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  //get rooms/groups created by user
  static async getUserCourseRoom(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const clerkId = req.params.id;
      const cachedKey = `courseRooms:${clerkId}`;
      const cachedGroups = await redis.get(cachedKey);
      if (cachedGroups) {
        console.log(`User Rooms ${clerkId} fetched from cache!`);
        res
          .status(200)
          .json(
            new ApiSuccess(
              200,
              "Course room created by user gotten from cache successfully",
              JSON.parse(cachedGroups)
            )
          );
      } else {
        console.log(
          `No cached room of key couseRooms:${clerkId} found. Fetching from database...`
        );

        const groups = await prisma.courseRoom.findMany({
          where: {
            userId: clerkId,
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            creator: true,
          },
        });
        console.log(groups);

        await redis.setex(cachedKey, 600, JSON.stringify(groups));
        res
          .status(200)
          .json(
            new ApiSuccess(200, "User Course rooms/groups gotten!", groups)
          );
      }
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiError(500, "Something went wrong!", error));
    }
  }

  //get single group/room
  static async getCourseGroupById(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const id = req.params.id;
      const cachedKey = `courseRoom:${id}`;
      const cachedGroup = await redis.get(cachedKey);
      if (cachedGroup) {
        console.log(`Room ${id} fetched from cache!`);
        res
          .status(200)
          .json(
            new ApiSuccess(
              200,
              "Course room by id gotten from cache successfully",
              JSON.parse(cachedGroup)
            )
          );
      } else {
        console.log(
          `No cached room of key couseRoom:${id} found. Fetching from database...`
        );

        const group = await prisma.courseRoom.findUnique({
          where: {
            id: id,
          },
          include: {
            creator: true,
          },
        });
        console.log(group);

        await redis.setex(cachedKey, 600, JSON.stringify(group));
        res
          .status(200)
          .json(new ApiSuccess(200, "Course rooms/groups gotten!", group));
      }
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiError(500, "Something went wrong!", error));
    }
  }

  //add cover image to a group
  static async addCoverImage(req: express.Request, res: express.Response) {
    try {
      const id = req.params.id;
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
      }
      const roomImageBuffer = req.file.buffer;

      const resizeImage = await sharp(roomImageBuffer)
        .resize({ width: 800 })
        .sharpen()
        .toFormat("png")
        .toBuffer();

      const base64image = resizeImage.toString("base64");
      const roomImage = `data:image/png;base64,${base64image}`;

      const ImageUrl = await cloudinary.uploader.upload(roomImage);

      const coverImage = await prisma.courseRoom.update({
        where: {
          id: id,
        },
        data: {
          coverImage: ImageUrl.url,
        },
      });
      console.log(coverImage);
      await redis.del(`couseRoom:${id}`);
      res
        .status(200)
        .json(new ApiSuccess(200, "Cover image added!", coverImage));
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiError(500, "Something went wrong!", error));
    }
  }

  //edit room/group details
  static async editRoom(req: express.Request, res: express.Response) {
    try {
      const id = req.params.id;
      const { roomName, roomDescription, category, status } = await req.body;

      let roomImageUrl: string | null = null;

      if (req.file) {
        const roomImageBuffer = req.file.buffer;

        const resizeImage = await sharp(roomImageBuffer)
          .resize(350, 350)
          .toFormat("png")
          .toBuffer();

        const base64image = resizeImage.toString("base64");
        const roomImage = `data:image/png;base64,${base64image}`;

        const ImageUrl = await cloudinary.uploader.upload(roomImage);
        roomImageUrl = ImageUrl.url;
      }

      const courseRoom = await prisma.courseRoom.update({
        where: {
          id: id,
        },
        data: {
          roomName,
          roomDescription,
          category,
          roomImage: roomImageUrl,
          status: status,
        },
      });
      console.log(courseRoom);
      await redis.del(`courseRoom:${id}`);
      res
        .status(200)
        .json(new ApiSuccess(200, "Group edited successfully!", courseRoom));
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiError(500, "Something went wrong!", error));
    }
  }

  //delete course room
  static async deleteRoom(req: express.Request, res: express.Response) {
    try {
      const roomId = req.params.id;
      await prisma.courseRoom.delete({
        where: {
          id: roomId,
        },
      });
      await redis.del(`couseRoom:${roomId}`);
      res
        .status(204)
        .json(
          new ApiSuccess(204, "Group deleted successfully🟢🟢!", "Room deleted")
        );
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong!🔴🔴", error));
    }
  }

  //add organizers in a room eg.admin,moderator...
  static async addOrganizers(req: express.Request, res: express.Response) {
    try {
      const validate = validateOrganizer.parse(await req.body);
      const { userId, roomId, role }: organizerType = validate;

      const addGroupOrganizers = await prisma.roomOrganizer.create({
        data: {
          user: {
            connect: {
              clerkId: userId,
            },
          },
          room: {
            connect: {
              id: roomId,
            },
          },
          role,
        },
      });
      console.log(addGroupOrganizers);
      res
        .status(201)
        .json(
          new ApiSuccess(201, "Group organizer added!", addGroupOrganizers)
        );
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiError(500, "Something went wrong!", error));
    }
  }

  //get every organizer in a room/group
  static async getRoomOrganizer(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const id = req.params.id; //roomId
      const cachedkey = `organizers:${id}`;
      const cachedOrganizers = await redis.get(cachedkey);
      if (cachedOrganizers) {
        console.log(`Room organizers fetched from cache!`);
        res
          .status(200)
          .json(
            new ApiSuccess(
              200,
              "Room organizers gotten from cache successfully",
              JSON.parse(cachedOrganizers)
            )
          );
      } else {
        console.log(
          `No cached room organizer of key organizers:${id} found. Fetching from database...`
        );

        const roomOrganizers = await prisma.roomOrganizer.findMany({
          where: {
            roomId: id,
          },
          include: {
            user: true,
            room: true,
          },
        });

        console.log(roomOrganizers);
        await redis.setex(cachedkey, 600, JSON.stringify(roomOrganizers));
        res
          .status(200)
          .json(
            new ApiSuccess(200, "Group organizers fetched!", roomOrganizers)
          );
      }
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiError(500, "Something went wrong!", error));
    }
  }

  //authorize role to perform specific task in a room
  static async authorizeRole(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const { userId, roomId, requiredRole } = await req.body;
      if (!userId || !roomId || !requiredRole) {
        res.status(400).json({ error: "Missing required fields" });
      }
      const organizer = await prisma.roomOrganizer.findFirst({
        where: {
          userId,
          roomId,
          role: { in: requiredRole },
        },
      });

      res.status(200).json({ authorized: !!organizer });
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiError(500, "Something went wrong!", error));
    }
  }

  //remove an organizer from a room
  static async removeOrganizer(req: express.Request, res: express.Response) {
    try {
      const organizerId = req.params.id;
      await prisma.roomOrganizer.delete({
        where: {
          id: organizerId,
        },
      });
      res.status(200).json(new ApiSuccess(200, "Group organizer deleted!", []));
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiError(500, "Something went wrong!", error));
    }
  }
}

export default CourseController;
