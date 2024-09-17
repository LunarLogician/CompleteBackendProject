require("dotenv").config();
const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const sequelize = require("./config/database");
var cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const venueRoutes = require("./routes/venueRoutes");
const dbRoutes = require("./routes/dbRoutes");
const requestRoutes = require("./routes/requestRoutes");
const messageRoutes = require("./routes/messageRoutes");
const adminRoutes = require("./routes/adminRoutes");

const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 3000;
const path = require("path");
const fs = require("fs");
const CSS_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.0/swagger-ui.min.css";

dotenv.config();

const app = express();
const server = http.createServer(app);

const { initSocket } = require("./config/socket");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  morgan("dev", {
    skip: function (req, res) {
      return res.statusCode < 400;
    },
  })
);

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);

app.use(morgan("combined", { stream: accessLogStream }));
app.get("/", (req, res) => {
  res.send("Hello, world!. This is check-in app's backend");
});
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/venues", venueRoutes);
app.use("/api/v1/requests", requestRoutes);
app.use("/api/v1/db", dbRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/admin", adminRoutes);
// Catch-all route to handle undefined routes (404)
app.use((req, res) => {
  res.status(404).json({
    error: "404 - Not Found",
    message: "The route you are trying to access does not exist.",
  });
});
initSocket(server);

const PORT = process.env.PORT || 8000;

sequelize
  .sync()
  .then(() => {
    console.log("Database Connected");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
