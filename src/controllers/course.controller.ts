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

