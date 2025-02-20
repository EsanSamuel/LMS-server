import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import compression from "compression";
import http from "http";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import users from "./routes/user.route";
import rooms from "./routes/room.route";
import courses from "./routes/course.route";
import { clerkMiddleware } from "@clerk/express";
import authLimiter from "./middlewares/rateLimiter";
import tracks from "./routes/tracking.route";

const app = express();
const server = http.createServer(app);
const PORT = "8080";

app.use(compression());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(clerkMiddleware());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  // store: ... , // Redis, Memcached, etc. See below.
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);
app.use("/v1", authLimiter, users);
app.use("/v1", rooms);
app.use("/v1", courses);
app.use("v1", tracks);

app.get("/", async (req: express.Request, res: express.Response) => {
  res.send("Hello from the server!");
});

const startServer = async () => {
  server.listen(PORT, () => console.log(`Server is running at ${PORT}🟢🟢`));
};

startServer();
