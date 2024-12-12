const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf } = format;

// Define a custom log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = createLogger({
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat
  ),
  transports: [
    new transports.Console(), // Logs to console
    new transports.File({ filename: "logs/cron.log" }) // Logs to file
  ],
});

module.exports = logger;
