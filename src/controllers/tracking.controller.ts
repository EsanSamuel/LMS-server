import express from "express";
import prisma from "../libs/prismadb";
import { ApiError, ApiSuccess } from "../utils/ApiResponse";
import { EngagedModules, EngagedCourses, EngagedRooms } from "@prisma/client";
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
        if (cachedModules) {
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
        if (cachedCourses) {
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

  static async trackRooms(req: express.Request, res: express.Response) {
    try {
      const { userId } = req.body;
      const roomId = req.params.id;

      const RoomViewedbyUser = await prisma.engagedRooms.create({
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
        },
      });
      console.log(RoomViewedbyUser);
      await redis.del(`trackRooms:${userId}`);
      res
        .status(201)
        .json(
          new ApiSuccess(
            201,
            "Rooms added to user progress tracker!",
            RoomViewedbyUser
          )
        );
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async getTrackRooms(req: express.Request, res: express.Response) {
    try {
      const clerkId = req.params.id;

      const user = await prisma.user.findUnique({
        where: {
          clerkId: clerkId,
        },
      });
      if (user) {
        const userId = user.id;

        const cachedkey = `trackRooms:${clerkId}`;
        //get cached user through key
        const cachedRooms = await redis.get(cachedkey);
        if (cachedRooms) {
          console.log(`Track modules ${clerkId} fetched from cache!`);
          res
            .status(200)
            .json(
              new ApiSuccess(
                200,
                "User gotten from cache successfully",
                JSON.parse(cachedRooms)
              )
            );
        } else {
          const getRooms = await prisma.engagedRooms.findMany({
            where: {
              userId,
            },
            orderBy: {
              addedAt: "desc",
            },
            include: {
              user: true,
              room: {
                include: {
                  Module: true,
                },
              },
            },
          });

          console.log(getRooms);
          await redis.setex(cachedkey, 600, JSON.stringify(getRooms));
          res
            .status(200)
            .json(
              new ApiSuccess(
                200,
                "Module added to user progress tarcker!",
                getRooms
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

  static async trackUserQuiz(req: express.Request, res: express.Response) {
    try {
      const { userId } = req.body;
      const quizId = req.params.id;

      const addQuizToUserProgressTracker = await prisma.engagedQuiz.create({
        data: {
          user: {
            connect: {
              clerkId: userId,
            },
          },
          quiz: {
            connect: {
              id: quizId,
            },
          },
        },
      });
      console.log(addQuizToUserProgressTracker);
      await redis.del(`trackQuiz:${userId}`);
      res
        .status(201)
        .json(
          new ApiSuccess(
            201,
            "Module added to user progress tracker!",
            addQuizToUserProgressTracker
          )
        );
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async getTrackQuiz(req: express.Request, res: express.Response) {
    try {
      const clerkId = req.params.id;

      const user = await prisma.user.findUnique({
        where: {
          clerkId: clerkId,
        },
      });
      if (user) {
        const userId = user.id;

        const cachedkey = `trackQuiz:${clerkId}`;
        //get cached user through key
        const cachedQuizzes = await redis.get(cachedkey);
        if (cachedQuizzes) {
          console.log(`Track modules ${clerkId} fetched from cache!`);
          res
            .status(200)
            .json(
              new ApiSuccess(
                200,
                "User gotten from cache successfully",
                JSON.parse(cachedQuizzes)
              )
            );
        } else {
          const getQuiz = await prisma.engagedQuiz.findMany({
            where: {
              userId,
            },
            orderBy: {
              addedAt: "desc",
            },
            include: {
              user: true,
              quiz: {
                include: {
                  questions: true,
                },
              },
            },
          });

          console.log(getQuiz);
          await redis.setex(cachedkey, 600, JSON.stringify(getQuiz));
          res
            .status(200)
            .json(
              new ApiSuccess(
                200,
                "Module added to user progress tarcker!",
                getQuiz
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
