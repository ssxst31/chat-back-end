import crypto from "crypto";
import util from "util";

const randomBytesPromise = util.promisify(crypto.randomBytes);
const pbkdf2Promise = util.promisify(crypto.pbkdf2);

export const createSalt = async () => {
  const buf = await randomBytesPromise(64);

  return buf.toString("base64");
};

export const createHashedPassword = async (password) => {
  const salt = await createSalt();
  const key = await pbkdf2Promise(password, salt, 104906, 64, "sha512");
  const hashedPassword = key.toString("base64");

  return { hashedPassword, salt };
};
