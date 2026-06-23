try {
  const emailService = require("../services/emailService");
  console.log("SUCCESS: emailService imported successfully with no syntax or require errors.");
} catch (error) {
  console.error("FAILURE: Import failed:", error);
  process.exit(1);
}
