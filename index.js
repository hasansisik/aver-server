require("dotenv").config();
require("express-async-errors");
//express
const cors = require("cors");
const express = require("express");
const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// rest of the packages
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

//database
const connectDB = require("./config/connectDB");

//routers
const authRouter = require("./routers/auth");
const headerRouter = require("./routers/header");
const footerRouter = require("./routers/footer");
const blogRouter = require("./routers/blog");
const projectRouter = require("./routers/project");
const glossaryRouter = require("./routers/glossary");
const serviceRouter = require("./routers/service");

//midlleware
const notFoundMiddleware = require("./middleware/not-found");
const erorHandlerMiddleware = require("./middleware/eror-handler");

//app
app.use(morgan("tiny"));
app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET_KEY));

app.use(express.urlencoded({ extended: true }));

app.use("/v1/auth", authRouter);
app.use("/v1/header", headerRouter);
app.use("/v1/footer", footerRouter);
app.use("/v1/blog", blogRouter);
app.use("/v1/project", projectRouter);
app.use("/v1/glossary", glossaryRouter);
app.use("/v1/service", serviceRouter);


app.use(notFoundMiddleware);
app.use(erorHandlerMiddleware);

const port = process.env.PORT || 3040;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL);
    app.listen(
      port,
      console.log(
        `MongoDb Connection Successful,App started on port ${port} : ${process.env.NODE_ENV}`
      )
    );
  } catch (error) {
    console.log(error);
  }
};

start();
