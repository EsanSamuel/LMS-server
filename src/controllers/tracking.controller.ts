import express from "express";
import prisma from "../libs/prismadb";
import { ApiError, ApiSuccess } from "utils/ApiResponse";

class TrackingController {
  static async trackUserModules(req: express.Request, res: express.Response) {
    try {
      const userId = req.params.userId;
      const moduleId = req.params.moduleId;

      const addModuleToUserCourses = await prisma.engagedModules.create({
        data: {
          user: {
            connect: {
              clerkId: userId,
            },
          },
          module: {
            connect: {
              id: moduleId,
            },
          },
        },
      });
      console.log(addModuleToUserCourses);
      res
        .status(201)
        .json(
          new ApiSuccess(
            201,
            "Module added to user progress tarcker!",
            addModuleToUserCourses
          )
        );
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async getTrackModules(req: express.Request, res: express.Response) {
    try {
      const clerkId = req.params.id;

      const user = await prisma.user.findUnique({
        where: {
          clerkId: clerkId,
        },
      });
      const userId = user.id;

      const getModules = await prisma.engagedModules.findMany({
        where: {
          userId,
        },
      });

      console.log(getModules);
      res
        .status(200)
        .json(
          new ApiSuccess(
            200,
            "Module added to user progress tarcker!",
            getModules
          )
        );
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }
}

export default TrackingController;
