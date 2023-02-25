require("dotenv").config();
const Sequelize = require("sequelize");
const bcrypt = require("bcryptjs");

const sequelize = new Sequelize(process.env.CONNECTION_STRING, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
});

module.exports = {
  Expenses: async (req, res) => {
    if (req.session.hasOwnProperty("user")) {
      if (req.session.user.hasOwnProperty("id")) {
        const deleteByDate = await sequelize.query(
          `delete from transactions where done_date < CURRENT_DATE`
        );

        const expense = await sequelize.query(
          `select coalesce(e.amount, '$0.00') - coalesce(t.amount, '$0.00') amount ,
          coalesce(e.expenseid, t.expenseid) expenseid,
          e.name, e.type, e.date, e.time, e.userid, e.priority
          from ( select expenseid, sum(amount) amount from transactions group by expenseid) t 
          full join (select expenseid, name, type, userid, date, time, amount, priority from expense group by priority, expenseid, amount, name, type, userid, date, time) e
          ON t.expenseid = e.expenseid 
          where e.userid = ${req.session.user.id}
          Order by priority`
        );

        let amountNegative = 0;
        let sendArray = [];
        let ind = 1;
        for (let exp of expense[0]) {
          let expObj = { ...exp };
          const expAmountInt = parseFloat(exp.amount.replace("$", ""));
          if (expAmountInt < 0) {
            if (expense[0].length !== ind) {
              amountNegative += Math.abs(expAmountInt);
              expObj.amount = "$0.00";
            } else {
              expObj.amount = `$${expAmountInt}`;
            }
          } else if (amountNegative > 0) {
            if (expense[0].length !== ind) {
              if (expAmountInt <= amountNegative) {
                amountNegative -= expAmountInt;
                expObj.amount = "$0.00";
              } else {
                expObj.amount = `$${expAmountInt - amountNegative}`;
              }
            } else {
              expObj.amount = `$${expAmountInt - amountNegative}`;
            }
          }
          sendArray.push(expObj);
          ind++;
        }
        res.status(200).send(sendArray);
      } else {
        res.status(200).redirect("/");
      }
    } else {
      res.status(200).redirect("/");
    }
  },
  UpdateExpense: async (req, res) => {
    const { updated, expense } = req.params;

    const update = await sequelize.query(
      `Update Expense Set name = '${updated}' Where Priority = ${expense + 1}`
    );
  },
  Income: async (req, res) => {
    if (req.session.hasOwnProperty("user")) {
      if (req.session.user.hasOwnProperty("id")) {
        const deleteByDate = await sequelize.query(
          `delete from transactions where done_date < CURRENT_DATE`
        );

        const income = await sequelize.query(
          `select amount from income where userid = ${req.session.user.id}`
        );

        res.status(200).send(income[0]);
      } else {
        res.status(200).redirect("/");
      }
    } else {
      res.status(200).redirect("/");
    }
  },
  Transaction: async (req, res) => {
    const { amount, expenseid } = req.params;
    const length = await sequelize.query(
      `select time, date from expense where expenseid = ${expenseid}`
    );

    let dateObj = new Date(length[0][0].date.replaceAll("-", "/"));

    let changeDate = new Date();
    switch (length[0][0].time) {
      case "Daily":
        while (dateObj < changeDate) {
          dateObj.setDate(dateObj.getDate() + 1);
        }

        break;

      case "Weekly":
        while (dateObj < changeDate) {
          dateObj.setDate(dateObj.getDate() + 7);
        }

        break;

      case "Bi-Weekly":
        while (dateObj < changeDate) {
          dateObj.setDate(dateObj.getDate() + 14);
        }

        break;

      case "Monthly":
        while (dateObj < changeDate) {
          dateObj.setMonth(dateObj.getMonth() + 1);
        }

        break;

      case "Yearly":
        while (dateObj < changeDate) {
          dateObj.setFullYear(dateObj.getFullYear() + 1);
        }

        break;

      default:
        break;
    }
    const transaction = await sequelize.query(
      `insert into transactions(amount,expenseid,done_date) values( ${amount},${expenseid},'${dateObj.getFullYear()}-${
        dateObj.getMonth() + 1
      }-${dateObj.getDate()}')`
    );
    const incomeSub = await sequelize.query(
      `update income set amount = amount - '$${amount}' where userid = ${req.session.user.id}`
    );
    res.status(200);
  },
  CreateExpense: async (req, res) => {
    if (req.session.hasOwnProperty("user")) {
      if (req.session.user.hasOwnProperty("id")) {
        const { name, type, amount, time, date } = req.fields;
        const expense = await sequelize.query(
          `insert into expense(name,type,amount,userid,Time ,date, priority) values('${name}','${type}',${amount},${req.session.user.id},'${time}','${date}', coalesce((Select MAX(priority) from expense),0) + 1)`
        );

        res.status(200).send("Complete");
      } else {
        res.status(200).redirect("/");
      }
    } else {
      res.status(200).redirect("/");
    }
  },
  CreateIncome: async (req, res) => {
    if (req.session.hasOwnProperty("user")) {
      if (req.session.user.hasOwnProperty("id")) {
        const { amount } = req.fields;
        const income = await sequelize.query(
          `update income set amount = amount + '$${amount}' where userid = ${req.session.user.id}`
        );

        res.status(200).send("Complete");
      } else {
        res.status(200).redirect("/");
      }
    } else {
      res.status(200).redirect("/");
    }
  },
  Session: (req, res) => {
    const session = req.session;
    res.status(200).send(session);
  },
  Login: (req, res) => {
    const { accountName, password } = req.fields;
    console.log(req);

    sequelize
      .query(`SELECT * FROM USERS WHERE name = '${accountName}';`)
      .then((seq) => {
        if (seq[0].length > 0) {
          if (bcrypt.compareSync(password, seq[0][0].password)) {
            req.session.user = {
              id: seq[0][0].userid,
              name: seq[0][0].name,
              password: seq[0][0].password,
            };

            res.status(200).send(req.session.user);
          } else {
            console.log("Password Did Not Match");
            res.status(204).send("Password Did Not Match");
          }
        } else {
          console.log("No Email Equals That");
          res.status(204).send("No Email Equals That");
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(400);
      });
  },
  CreateAccount: async (req, res) => {
    const { accountName, password } = req.fields;
    let salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(password, salt);

    const users = await sequelize.query(
      `SELECT * from USERS where name = '${accountName}';`
    );

    if (users[0].length > 0 === false) {
      const account = await sequelize.query(
        `insert into users (password, name) Values ('${hash}', '${accountName}');`
      );
      const income = await sequelize.query(
        `insert into income (amount, userid) Values (0,(select userid from users where name = '${accountName}'))`
      );
      res.status(200).redirect("/");
    } else {
      res.status(400).send("User with that Email Already Exists");
    }
  },
  Priority: async (req, res) => {
    const { expenseid, up } = req.params;
    const priority = await sequelize.query(
      `SELECT priority from Expense where expenseid = ${expenseid}`
    );

    const updated = up === "true";

    if (updated) {
      const movable = await sequelize.query(
        `Select expenseid from expense where priority > ${priority[0][0].priority} And userid = ${req.session.user.id}`
      );
      if (movable[0].length !== 0) {
        sequelize.query(
          `update expense set priority = coalesce(priority, 1) - 1 where priority = ${
            priority[0][0].priority + 1
          } And userid = ${req.session.user.id};
      update expense set priority = coalesce(priority, 0) + 1 where expenseid = ${expenseid};`
        );
        res.status(200).send("Done");
      } else {
        res.status(200).send("End");
      }
    } else {
      const movable = await sequelize.query(
        `Select expenseid from expense where priority < ${priority[0][0].priority} And userid = ${req.session.user.id}`
      );
      if (movable[0].length !== 0) {
        sequelize.query(
          `update expense set priority = coalesce(priority, 1) + 1 where priority = ${
            priority[0][0].priority - 1
          } And userid = ${req.session.user.id};
      update expense set priority = coalesce(priority, 0) - 1 where expenseid = ${expenseid};`
        );
        res.status(200).send("Done");
      } else {
        res.status(200).send("End");
      }
    }
  },
};
