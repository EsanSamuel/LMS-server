import express from "express";
import Redis from "ioredis";
import {
  commentType,
  contentType,
  moduleType,
  organizerType,
  roomType,
  userType,
  validateComment,
  validateContent,
  validateCourseModule,
  validateOrganizer,
  validateRoom,
  validateUser,
} from "../libs/validation";
import prisma from "../libs/prismadb";
import { ApiError, ApiSuccess } from "../utils/ApiResponse";
import { CourseRoom, User, Content, UserAnswer } from "@prisma/client";
import sharp from "sharp";
import cloudinary from "../utils/cloudinary";
import streamifier from "streamifier";
import { UploadApiResponse } from "cloudinary";

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
      const validate = validateCourseModule.parse(await req.body);
      const { roomId, title, position, description, userId }: moduleType =
        validate;
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
      await redis.del(`module:${roomId}`);
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
      if (cachedModules || cachedModules !== null) {
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

  static async editCourseModule(req: express.Request, res: express.Response) {
    try {
      const { title, position, description } = await req.body;
      const moduleId = req.params.id;
      const edit_module = await prisma.module.update({
        where: {
          id: moduleId,
        },
        data: {
          title,
          position,
          description,
        },
      });
      console.log(edit_module);
      await redis.del(`module:${moduleId}`);
      res
        .status(200)
        .json(new ApiSuccess(200, "Course module edited!🟢🟢", edit_module));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async getCourseModuleById(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const moduleId = req.params.id;
      const cachedKey = `module:${moduleId}`;
      const cachedModule = await redis.get(cachedKey);
      if (cachedModule) {
        console.log(cachedModule);
        res
          .status(200)
          .json(
            new ApiSuccess(
              200,
              "Course module gotten from cache🟢🟢",
              JSON.parse(cachedModule)
            )
          );
      } else {
        const module = await prisma.module.findUnique({
          where: {
            id: moduleId,
          },
          include: {
            creator: true,
            room: true,
          },
        });
        console.log(module);
        await redis.setex(cachedKey, 600, JSON.stringify(module));
        res
          .status(200)
          .json(new ApiSuccess(200, "Course module gotten🟢🟢", module));
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async deleteCourseModule(req: express.Request, res: express.Response) {
    try {
      const moduleId = req.params.id;
      await prisma.module.delete({
        where: {
          id: moduleId,
        },
      });
      await redis.del(`module:${moduleId}`);
      res
        .status(204)
        .json(new ApiSuccess(204, "Course module deleted🟢🟢", ""));
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
      const { thumbnailUrl, videoUrls, imageUrls, pdfUrls } = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      const processedImage = async (file: Express.Multer.File) => {
        const imageBuffer = file.buffer;

        const resizeImage = await sharp(imageBuffer)
          .resize(2500, 910, { fit: "contain" })
          .toFormat("png")
          .toBuffer();

        const base64image = resizeImage.toString("base64");
        const roomImage = `data:image/png;base64,${base64image}`;

        const uploadImage = await cloudinary.uploader.upload(roomImage);
        return uploadImage.url;
      };

      const processedPdf = async (
        file: Express.Multer.File
      ): Promise<string> => {
        return new Promise((resolve, reject) => {
          if (!file.buffer) {
            console.error("File buffer is empty!");
            return reject("File buffer is empty!");
          }

          // Convert the file buffer to a base64 string
          const pdfToString = file.buffer.toString("base64");
          const pdf = `data:application/pdf;base64,${pdfToString}`;

          cloudinary.uploader
            .upload_large(pdf, {
              resource_type: "raw",
              folder: "pdf_uploads",
              chunk_size: 20_000_000, // 20MB chunks for large files
              timeout: 900000, // 15 minutes timeout
            })
            .then((result: UploadApiResponse) => {
              resolve(result.secure_url);
            })
            .catch((error: any) => {
              console.error("Cloudinary Upload Error:", error);
              reject("PDF upload failed");
            });
        });
      };

      const processedVideo = async (file: Express.Multer.File) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: "video",
              folder: "videos",
              format: "mp4",
              chunk_size: 10_000_000,
              timeout: 900000,
            },
            (error, result) => {
              if (error) {
                console.error("Cloudinary Video Upload Error:", error);
                reject("Video upload failed");
              } else {
                resolve(result?.secure_url);
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

      const pdfs = pdfUrls?.length
        ? await Promise.all(pdfUrls.map((file) => processedPdf(file)))
        : [];
      console.log("Pdf URLs:", pdfs);

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
          pdf: pdfs as string[],
        },
      });

      console.log(create_course);
      await redis.del(`courses:${create_course.id}`);
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
            createdAt: "asc",
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
        res.status(200).json(new ApiSuccess(200, "Course goten🟢🟢!", course));
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

  static async deleteCourse(req: express.Request, res: express.Response) {
    try {
      const courseId = req.params.Id;
      await prisma.content.delete({
        where: {
          id: courseId,
        },
      });
      await redis.del(`course:${courseId}`);
      res.status(204).json(new ApiSuccess(204, "Course deleted🟢🟢!", ""));
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

  static async deleteComment(req: express.Request, res: express.Response) {
    try {
      const commentId = req.params.id;
      await prisma.comment.delete({
        where: {
          id: commentId,
        },
      });
      await redis.del(`comment:${commentId}`);
      res.status(204).json(new ApiSuccess(204, "Comment deleted!🟢🟢!", ""));
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
      await redis.del(`quizzes:${quiz.id}`);
      res.status(201).json(new ApiSuccess(201, "Quiz created!", quiz));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async editQuiz(req: express.Request, res: express.Response) {
    try {
      const courseId = req.params.id;
      const { title, questions } = await req.body;

      const quiz = await prisma.quiz.update({
        where: {
          id: courseId,
        },
        data: {
          title,
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
      await redis.del(`quizzes:${quiz.id}`);
      res.status(201).json(new ApiSuccess(201, "Quiz edited!", quiz));
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

  static async deleteQuiz(req: express.Request, res: express.Response) {
    try {
      const quizId = req.params.id;
      await prisma.quiz.delete({
        where: {
          id: quizId,
        },
        include: {
          questions: true,
        },
      });
      res.status(204).json(new ApiSuccess(204, "Quiz deleted🟢🟢!", ""));
    } catch (error) {
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async checkAnswer(req: express.Request, res: express.Response) {
    try {
      const userId = req.params.id;
      const { answers } = await req.body;

      const user = await prisma.user.findUnique({
        where: {
          clerkId: userId,
        },
      });

      const userAnswers = await prisma.$transaction(
        answers?.map((answer: any) =>
          prisma.userAnswer.create({
            data: {
              userId: user.id,
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

  static async deleteAnswers(req: express.Request, res: express.Response) {
    try {
      const userId = req.params.id;

      const user = await prisma.user.findUnique({
        where: {
          clerkId: userId,
        },
      });
      await prisma.userAnswer.deleteMany({
        where: {
          userId: user.id,
        },
      });
      res
        .status(204)
        .json(new ApiSuccess(204, "Quiz answer🟢🟢!", "userAnswers deleted"));
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json(new ApiError(500, "Something went wrong🔴🔴!", error));
    }
  }

  static async getUserAnswer(req: express.Request, res: express.Response) {
    try {
      const quizId = req.params.id;
      const userAnswers = await prisma.userAnswer.findMany({
        where: { question: { quizId } },
        include: { question: true },
      });

      res
        .status(200)
        .json(new ApiSuccess(200, "Quiz answer gotten🟢🟢!", userAnswers));
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

    const gradedAnswers = await prisma.$transaction(
      userAnswers.map((answer) =>
        prisma.userAnswer.update({
          where: { id: answer.id },
          data: { isCorrect: answer.answer === answer.question.correctAnswer },
          include: {
            user: true,
          },
        })
      )
    );

    res
      .status(201)
      .json(new ApiSuccess(201, "Quiz answer graded🟢🟢!", gradedAnswers));
  }
}

export default CourseController;
