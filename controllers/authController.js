import { StatusCodes } from "http-status-codes";

import { createError } from "../utils/responseUtils.js";
import { loginValidator, USER_VALIDATION_ERRORS } from "../utils/validator.js";
import { createToken } from "../utils/authorizeUtils.js";
import getConnection from "../routes/pool.js";
import { createHashedPassword, verifyPassword } from "../utils/hash.js";

export const signUp = async (req, res) => {
  const { email, password, nickname } = req.body;

  const { hashedPassword, salt } = await createHashedPassword(password);

  const { isValid, message } = loginValidator({ email, password });

  if (!isValid) {
    return res.status(StatusCodes.BAD_REQUEST).send(createError(message));
  }

  getConnection((conn) => {
    const sql1 = `SELECT SQL_CALC_FOUND_ROWS * FROM users WHERE email LIKE '%${email}%';`;

    conn.query(sql1, (error, rows) => {
      if (rows.length > 0) {
        return res.status(StatusCodes.CONFLICT).send({
          message: USER_VALIDATION_ERRORS.EXIST_USER,
        });
      } else {
        conn.query(
          "INSERT INTO users ( nickname, email, password, salt ) VALUES ?;",
          [
            [[nickname, email, hashedPassword, salt]],
            (error) => {
              if (error) {
                return console.log(error);
              }
            },

            res
              .cookie("token", createToken({ email, nickname }))
              .status(StatusCodes.OK)
              .send({
                message: "계정이 성공적으로 생성되었습니다",
              }),
          ]
        );
      }
    });

    conn.release();
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const { isValid, message } = loginValidator({ email, password });

  if (!isValid) {
    return res.status(StatusCodes.BAD_REQUEST).send(createError(message));
  }

  getConnection((conn) => {
    const query = `SELECT SQL_CALC_FOUND_ROWS * FROM users WHERE email LIKE '%${email}%';`;

    conn.query(query, async (error, rows) => {
      if (error) throw error;
      else {
        if (rows.length === 0) {
          return res.status(StatusCodes.BAD_REQUEST).send({
            message: "없는 아이디 입니다.",
          });
        } else {
          const row = rows[0];
          const nickname = row.nickname;
          const verified = await verifyPassword(
            password,
            row.salt,
            row.password
          );
          if (!verified) {
            return res.status(StatusCodes.BAD_REQUEST).send({
              message: "비밀번호가 틀렸습니다.",
            });
          } else {
            return res
              .cookie("token", createToken({ email, nickname }))
              .status(StatusCodes.OK)
              .send({
                message: "성공적으로 로그인 했습니다",
              });
          }
        }
      }
    });

    conn.release();
  });
};
