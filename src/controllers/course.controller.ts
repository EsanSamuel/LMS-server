import express from "express";
import Redis from "ioredis";
import {
  commentType,
  contentType,
  organizerType,
  roomType,
  userType,
  validateComment,
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

//interface for destructured object in multer
interface MulterfileInterface {
  thumbnailUrl: Express.Multer.File[];
  videoUrls: Express.Multer.File[];
  imageUrls: Express.Multer.File[];
  pdf: Express.Multer.File[];
}

//initialize redis for caching
const redis = new Redis();

class CourseController {
  //create a module inside a room in which several course lesson are created in
  static async createCourseModule(req: express.Request, res: express.Response) {
    try {
      const { roomId, title, position, description, userId } = await req.body;
      const module = await prisma.module.create({
        data: {
          room: {
            connect: {
              id: roomId,
            },
          },
          creator: {
            connect: {
              clerkId: userId,
            },
          },
          title,
          position,
          description,
        },
      });

      console.log(module);
      res
        .status(201)
        .json(new ApiSuccess(201, "Module for courses created🟢🟢!", module));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  //get each modules in a room
  static async getCourseModules(req: express.Request, res: express.Response) {
    try {
      const roomId = req.params.id;
      const cachedKey = `module:${roomId}`;
      const cachedModules = await redis.get(cachedKey);
      if (cachedModules) {
        console.log("Cached courses:", cachedModules);
        res
          .status(201)
          .json(
            new ApiSuccess(
              200,
              "Course modules gotten from cache🟢🟢!",
              JSON.parse(cachedModules)
            )
          );
      } else {
        const course_modules = await prisma.module.findMany({
          where: {
            roomId: roomId,
          },
          include: {
            room: true,
            creator: true,
          },
        });
        console.log(course_modules);
        await redis.setex(cachedKey, 600, JSON.stringify(course_modules));
        res
          .status(200)
          .json(
            new ApiSuccess(200, "Course module gotten🟢🟢", course_modules)
          );
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }
  //create course
  static async createCourse(req: express.Request, res: express.Response) {
    try {
      const validate = validateContent.parse(await req.body);
      const {
        title,
        textContent,
        userId,
        moduleId,
        status,
        isDiscussion,
      }: contentType = validate;
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
          Module: {
            connect: {
              id: moduleId,
            },
          },
          title,
          textContent,
          thumbnailUrl: thumbnail,
          videoUrls: videos as string[],
          imageUrls: images,
          status: status,
          isDiscussion,
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
            moduleId: id,
          },
          include: {
            creator: true,
            Module: true,
            Comment: true,
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
            Module: true,
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
            Module: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        console.log(courses);

        await redis.setex(cachedkey, 600, JSON.stringify(courses));
        res
          .status(200)
          .json(new ApiSuccess(200, "Course gotten🟢🟢!", courses));
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async createComment(req: express.Request, res: express.Response) {
    try {
      const validate = validateComment.parse(await req.body);
      const { userId, contentId, comment }: commentType = validate;
      const create_comment = await prisma.comment.create({
        data: {
          author: {
            connect: {
              clerkId: userId,
            },
          },
          content: {
            connect: {
              id: contentId,
            },
          },
          comment,
        },
      });
      console.log(create_comment);
      res
        .status(201)
        .json(new ApiSuccess(201, "Comment created!🟢🟢!", create_comment));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async getComments(req: express.Request, res: express.Response) {
    try {
      const id = req.params.id;
      const cachedKey = `comments:${id}`;
      const cachedComments = await redis.get(cachedKey);
      if (cachedComments) {
        console.log("Cached comments:", cachedComments);
        res
          .status(200)
          .json(
            new ApiSuccess(
              201,
              "Comment gotten from cache!🟢🟢!",
              JSON.parse(cachedComments)
            )
          );
      } else {
        console.log("Fectching comments from database...");
        const comments = await prisma.comment.findMany({
          where: {
            contentId: id,
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            author: true,
            content: true,
          },
        });
        console.log(comments);
        await redis.setex(cachedKey, 600, JSON.stringify(comments));
        res
          .status(200)
          .json(new ApiSuccess(200, "Comment gotten!🟢🟢!", comments));
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async getCommentById(req: express.Request, res: express.Response) {
    try {
      const id = req.params.id;
      const cachedKey = `comment:${id}`;
      const cachedComment = await redis.get(cachedKey);
      if (cachedComment) {
        console.log("Cached comment:", cachedComment);
        res
          .status(200)
          .json(
            new ApiSuccess(
              201,
              "Comment gotten from cache!🟢🟢!",
              JSON.parse(cachedComment)
            )
          );
      } else {
        console.log("Fetching comments from database...");
        const comments = await prisma.comment.findUnique({
          where: {
            id: id,
          },
          include: {
            author: true,
            content: true,
          },
        });
        console.log(comments);
        await redis.setex(cachedKey, 600, JSON.stringify(comments));
        res
          .status(200)
          .json(new ApiSuccess(200, "Comment gotten!🟢🟢!", comments));
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  //like a course
  static async likeCourse(req: express.Request, res: express.Response) {
    try {
      const contentId = req.params.id;
      const { userId } = await req.body;
      if (!userId || !contentId) {
        res
          .status(404)
          .json(
            new ApiError(404, "Ids required🔴🔴!", [
              "userId and courseId required!",
            ])
          );
      }
      const likeCourse = await prisma.likeCourse.create({
        data: {
          user: {
            connect: {
              clerkId: userId,
            },
          },
          content: {
            connect: {
              id: contentId,
            },
          },
        },
      });
      console.log(likeCourse);

      res
        .status(201)
        .json(new ApiSuccess(201, "Course  liked🟢🟢!", likeCourse));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  //get each likes for a course
  static async getLikes(req: express.Request, res: express.Response) {
    try {
      const id = req.params.id;
      const cachedKey = `likes:${id}`;
      const cachedLikes = await redis.get(cachedKey);
      if (cachedLikes) {
        console.log(cachedLikes);

        res
          .status(200)
          .json(
            new ApiError(
              200,
              "Likes gotten from cache🟢🟢!",
              JSON.parse(cachedLikes)
            )
          );
      } else {
        console.log("No cached likes. Fetching from database...");
        const get_Likes = await prisma.likeCourse.findMany({
          where: {
            contentId: id,
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            user: true,
            content: true,
          },
        });
        console.log(get_Likes);
        await redis.setex(cachedKey, 600, JSON.stringify(get_Likes));
        res
          .status(200)
          .json(new ApiSuccess(200, "Likes fetched🟢🟢!", get_Likes));
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  //create quiz for each courses
  static async createQuiz(req: express.Request, res: express.Response) {
    try {
      const { title, courseId, questions, userId } = await req.body;

      const quiz = await prisma.quiz.create({
        data: {
          title,
          course: {
            connect: {
              id: courseId,
            },
          },
          author: {
            connect: {
              clerkId: userId,
            },
          },
          //quiz questions
          questions: {
            create: questions.map((q: any) => ({
              text: q.text,
              options: q.options ?? [],
              correctAnswer: q.correctAnswer,
            })),
          },
        },
      });
      console.log(quiz);
      res.status(201).json(new ApiSuccess(201, "Quiz created!", quiz));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async getQuiz(req: express.Request, res: express.Response) {
    try {
      const id = req.params.id;
      const cachedKey = `quizzes:${id}`;
      const cachedQuizzes = await redis.get(cachedKey);
      if (cachedQuizzes) {
        console.log(cachedQuizzes);
        res
          .status(200)
          .json(
            new ApiSuccess(
              200,
              "Quiz gotten from cache🟢🟢!",
              JSON.parse(cachedQuizzes)
            )
          );
      } else {
        console.log("No quizzes at cache. Fetching from Database...");
        const get_quiz = await prisma.quiz.findMany({
          where: {
            courseId: id,
          },
          include: {
            questions: true,
          },
        });
        console.log(get_quiz);
        await redis.setex(cachedKey, 600, JSON.stringify(get_quiz));
        res.status(200).json(new ApiSuccess(200, "Quiz gotten🟢🟢!", get_quiz));
      }
    } catch (error) {
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async checkAnswer(req: express.Request, res: express.Response) {
    try {
      const { userId, answers } = await req.body;

      const userAnswers = await prisma.$transaction(
        answers.map((answer: any) =>
          prisma.userAnswer.create({
            data: {
              userId,
              questionId: answer.questionId,
              answer: answer.answer,
              isCorrect: null,
            },
          })
        )
      );

      res
        .status(201)
        .json(new ApiSuccess(201, "Quiz answer🟢🟢!", userAnswers));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async gradeQuiz(req: express.Request, res: express.Response) {
    const { quizId } = req.params;
    const userAnswers = await prisma.userAnswer.findMany({
      where: { question: { quizId } },
      include: { question: true },
    });

    const quizzQuestions = await prisma.question.findMany({
      where: {
        quizId,
      },
    });

    const gradedAnswers = await prisma.$transaction(
      userAnswers.map((answer) =>
        prisma.userAnswer.update({
          where: { id: answer.id },
          data: { isCorrect: answer.answer === answer.question.correctAnswer },
        })
      )
    );

    console.log(
      `User Score: ${gradedAnswers.length} / ${quizzQuestions.length}`
    );

    res
      .status(201)
      .json(new ApiSuccess(201, "Quiz answer graded🟢🟢!", gradedAnswers));
  }
}

export default CourseController;
