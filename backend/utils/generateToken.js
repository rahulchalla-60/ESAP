import jwt from "jsonwebtoken";
import config from "../config/environment.js";

const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

export default generateToken;
