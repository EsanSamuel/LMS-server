import express from "express";
import prisma from "../libs/prismadb";
import { ApiError, ApiSuccess } from "../utils/ApiResponse";
import { EngagedModules, EngagedCourses } from "@prisma/client";
import Redis from "ioredis";

const redis = new Redis();
class TrackingController {
  static async trackUserModules(req: express.Request, res: express.Response) {
    try {
      const { userId } = req.body;
      const moduleId = req.params.id;
      console.log(req.body, moduleId);

      const addModuleToUserProgressTracker = await prisma.engagedModules.create(
        {
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
        }
      );
      console.log(addModuleToUserProgressTracker);
      await redis.del(`trackModules:${userId}`);
      res
        .status(201)
        .json(
          new ApiSuccess(
            201,
            "Module added to user progress tracker!",
            addModuleToUserProgressTracker
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
      if (user) {
        const userId = user.id;

        const cachedkey = `trackModules:${clerkId}`;
        //get cached user through key
        const cachedModules = await redis.get(cachedkey);
        if (!cachedModules) {
          console.log(`Track modules ${clerkId} fetched from cache!`);
          res
            .status(200)
            .json(
              new ApiSuccess(
                200,
                "User gotten from cache successfully",
                JSON.parse(cachedModules)
              )
            );
        } else {
          const getModules = await prisma.engagedModules.findMany({
            where: {
              userId,
            },
            orderBy: {
              addedAt: "desc",
            },
            include: {
              user: true,
              module: {
                include: {
                  Content: true,
                },
              },
            },
          });

          console.log(getModules);
          await redis.setex(cachedkey, 600, JSON.stringify(getModules));
          res
            .status(200)
            .json(
              new ApiSuccess(
                200,
                "Module added to user progress tarcker!",
                getModules
              )
            );
        }
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async trackCourses(req: express.Request, res: express.Response) {
    try {
      const { userId } = req.body;
      const courseId = req.params.id;

      const CoursesViewedbyUser = await prisma.engagedCourses.create({
        data: {
          user: {
            connect: {
              clerkId: userId,
            },
          },
          content: {
            connect: {
              id: courseId,
            },
          },
        },
      });
      console.log(CoursesViewedbyUser);
      await redis.del(`trackCourses:${userId}`);
      res
        .status(201)
        .json(
          new ApiSuccess(
            201,
            "Course added to user progress tracker!",
            CoursesViewedbyUser
          )
        );
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async getTrackCourses(req: express.Request, res: express.Response) {
    try {
      const clerkId = req.params.id;

      const user = await prisma.user.findUnique({
        where: {
          clerkId: clerkId,
        },
      });
      if (user) {
        const userId = user.id;

        const cachedkey = `trackCourses:${clerkId}`;
        //get cached user through key
        const cachedCourses = await redis.get(cachedkey);
        if (!cachedCourses) {
          console.log(`Track modules ${clerkId} fetched from cache!`);
          res
            .status(200)
            .json(
              new ApiSuccess(
                200,
                "User gotten from cache successfully",
                JSON.parse(cachedCourses)
              )
            );
        } else {
          const getCourses = await prisma.engagedCourses.findMany({
            where: {
              userId,
            },
            orderBy: {
              addedAt: "desc",
            },
            include: {
              user: true,
              content: {
                include: {
                  Module: true,
                },
              },
            },
          });

          console.log(getCourses);
          await redis.setex(cachedkey, 600, JSON.stringify(getCourses));
          res
            .status(200)
            .json(
              new ApiSuccess(
                200,
                "Module added to user progress tarcker!",
                getCourses
              )
            );
        }
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }
}

export default TrackingController;
