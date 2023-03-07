require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const chalk = require("chalk");
const formidable = require("express-formidable");

const session = require("express-session");

app.set("trust proxy", 1);

app.use(express.json());
app.use(formidable());
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
  })
);

const PORT = 5000;

const {
  Session,
  Expenses,
  Login,
  CreateAccount,
  CreateExpense,
  Priority,
  CreateIncome,
  Income,
  Transaction,
  UpdateExpense,
} = require("./controllers");

app.use(
  session({
    // name:"userSession",
    secret: process.env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 3,
    },

    resave: false,
    saveUninitialized: false,
  })
);

app.get("/api/Session", Session);

app.get("/api/Expenses", Expenses);

app.get("/api/Income", Income);

app.put("/api/Priority/:expenseid/:up", Priority);

app.put("/api/Expense/:expenseid/:amount/:date", Transaction);

app.post("/api/Login", Login);

app.post("/api/CreateAccount", CreateAccount);

app.post("/api/CreateExpense", CreateExpense);

app.put("/api/UpdateExpense/:updated/:expense", UpdateExpense);

app.post("/api/CreateIncome", CreateIncome);

app.listen(PORT, () => {
  console.log(chalk.blue(`Listening on Port ${PORT}`));
});
