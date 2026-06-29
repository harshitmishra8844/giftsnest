const mongoose = require("mongoose");
const dotenv = require("dotenv");
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

dotenv.config({ path: "c:/gift/.env" });

const EmailLog = require("../models/EmailLog");

const getLatestOtp = async () => {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.error("MONGO_URI not set.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
    const latestEmail = await EmailLog.findOne({
      to: "niyoragifts@gmail.com",
      subject: { $regex: /Your Verification Code/i }
    }).sort({ createdAt: -1 });

    if (!latestEmail) {
      console.log("No OTP email found for niyoragifts@gmail.com");
    } else {
      console.log("Latest Subject:", latestEmail.subject);
      const match = latestEmail.subject.match(/(\d{6})/);
      if (match) {
        console.log("FOUND_OTP:", match[1]);
      } else {
        console.log("OTP code not matched in subject:", latestEmail.subject);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

getLatestOtp();
