import winston from "winston";

const level = process.env.CYRUS_LOG_LEVEL || "info";

export const logger = winston.createLogger({
  level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "cyrus-platform-api", env: process.env.NODE_ENV || "development" },
  transports: [
    new winston.transports.Console(),
  ],
});
