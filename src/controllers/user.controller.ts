import express from "express";
import Redis from "ioredis";
import { userType, validateUser } from "../libs/validation";
import prisma from "../libs/prismadb";
import { ApiError, ApiSuccess } from "../utils/ApiResponse";
import { User } from "@prisma/client";
import sharp from "sharp";
import cloudinary from "../utils/cloudinary";

const redis = new Redis();

const getCurrentUser = async <T>(clerkId: string): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: {
      clerkId: clerkId,
    },
  });
  return user.email;
};

class UserController {
  static async createUser(req: express.Request, res: express.Response) {
    const validate = validateUser.parse(await req.body);
    const { username, email, clerkId }: userType = validate;

    if (!username || !email || !clerkId) {
      res.status(401).send("Invalid data!");
    }

    const [uniqueUsername, domain] = email.split("@");

    console.log(uniqueUsername);

    try {
      const user = await prisma.user.create({
        data: {
          username: username,
          email: email,
          clerkId: clerkId,
          uniqueName: uniqueUsername,
        },
      });

      console.log(user);

      res
        .status(201)
        .json(new ApiSuccess(201, "User created successfully", user));
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiError(500, "Something went wrong!", error));
    }
  }

  static async getUser(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const id = req.params.id;
      //create a redis key for user
      const cachedkey = `user:${id}`;
      //get cached user through key
      const cachedUser = await redis.get(cachedkey);
      if (cachedUser) {
        console.log(`User ${id} fetched from cache!`);
        res
          .status(200)
          .json(
            new ApiSuccess(
              200,
              "User gotten successfully",
              JSON.parse(cachedUser)
            )
          );
      }
      const user = await prisma.user.findUnique({
        where: {
          clerkId: id,
        },
      });
      if (!user) {
        res
          .status(500)
          .json(new ApiError(500, "User not found!", ["User not found!"]));
      }
      console.log(user);
      // Cache user data for 10 minutes
      await redis.setex(cachedkey, 600, JSON.stringify(user));
      res
        .status(200)
        .json(new ApiSuccess(200, "User gotten successfully", user));
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiError(500, "Something went wrong!", error));
    }
  }

  static async getUsers(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      //const clerkId = req.params.id;
      //const currentUserEmail = getCurrentUser(clerkId);
      const cachedKey = "users";
      const cachedUsers = await redis.get(cachedKey);
      if (cachedUsers) {
        console.log("Users fetched from cachedUsers!");
        res
          .status(200)
          .json(
            new ApiSuccess(
              200,
              "User gotten successfully",
              JSON.parse(cachedUsers)
            )
          );
      }
      const users = await prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
      console.log(users);
      await redis.setex(cachedKey, 600, JSON.stringify(users));
      res
        .status(200)
        .json(new ApiSuccess(200, "User created successfully", users));
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiError(500, "Something went wrong!", error));
    }
  }

  static async editProfile(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    try {
      const id = req.params.id;
      const { username, bio } = await req.body;
      console.log(req.body);

      let ImageUrl: string | null = null;

      if (req.file) {
        const imageBuffer = req.file.buffer;

        const resizeImage = await sharp(imageBuffer)
          .resize(150, 150)
          .toFormat("png")
          .toBuffer();

        const base64image = resizeImage.toString("base64");
        const image = `data:image/png;base64,${base64image}`;

        const imageUrl = await cloudinary.uploader.upload(image);
        ImageUrl = imageUrl.url;
      }

      const editProfile = await prisma.user.update({
        where: {
          clerkId: id,
        },
        data: {
          username,
          bio,
          profileImage: ImageUrl,
        },
      });
      console.log(editProfile);
      //clear cache on edit profile
      await redis.del(`user:${id}`);
      res
        .status(200)
        .json(new ApiSuccess(200, "User updated successfully", editProfile));
    } catch (error) {
      console.log(error);
      res.status(500).json(new ApiError(500, "Something went wrong!", error));
    }
  }
}

export default UserController;
