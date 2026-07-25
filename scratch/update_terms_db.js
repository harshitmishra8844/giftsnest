const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const CmsContent = require("../models/CmsContent");

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/giftsnest";
    console.log("Connecting to MongoDB at:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    // 1. Update Policies Section with Terms & Conditions HTML
    const policyRecord = await CmsContent.findOne({ section: "policies" });
    if (policyRecord) {
      console.log("Updating policies.termsConditions in DB...");
      const termsHtml = "<h2>Terms & Conditions</h2><p>Welcome to <strong>Niyora Gifts</strong>! These Terms & Conditions govern your website usage and the creation and use of your account. By registering or using our site, you agree to be bound by these Terms. Please read them carefully.</p><h3>1. Account Registration</h3><ul><li>To place an order, save details, or access priority features on Niyora Gifts, you are required to <strong>create an account</strong>.</li><li>When registering, you agree to provide <strong>accurate, current, and complete details</strong> (name, email, phone, and delivery address).</li><li>You must be <strong>at least 18 years old</strong> (or have parental/guardian consent) to make purchases.</li></ul><h3>2. Account Responsibility</h3><ul><li>You are solely responsible for <strong>all activities</strong> that occur under your account.</li><li>You must keep your login credentials secure. If you suspect any breach, notify support immediately at <strong>niyoragifts@gmail.com</strong>.</li></ul><h3>3. Accuracy of Information</h3><ul><li>You agree to keep shipping address and contact details up to date.</li><li>Niyora Gifts is not responsible for failed deliveries or delays resulting from <strong>incorrect or outdated information</strong>.</li></ul><h3>4. One Account Per User</h3><ul><li>Customers are permitted to maintain <strong>one active account</strong>. Registering multiple accounts to abuse offers or promotions is strictly prohibited.</li></ul><h3>5. Suspension & Termination</h3><ul><li>We reserve the right to suspend or terminate accounts without prior notice if fraudulent activity, duplicate accounts, or policy violations are suspected.</li></ul><h3>6. Privacy & Data Use</h3><ul><li>Your data is handled in accordance with privacy laws. By creating an account, you consent to Niyora Gifts collecting and using data for order fulfillment.</li></ul><h3>7. Website Usage</h3><ul><li>You agree to use the site for lawful shopping purposes only. Disruption or hacking attempts are strictly prohibited.</li></ul><h3>8. Order & Purchase Terms</h3><ul><li>All checkout purchases are additionally subject to our <strong>Shipping Policy</strong> and <strong>Returns Policy</strong>.</li></ul><h3>9. Changes to Terms</h3><ul><li>We may update or revise these Terms at any time. Continued use of your account after changes are posted constitutes acceptance of revised Terms.</li></ul><h3>10. Account Deletion</h3><ul><li>To delete your account, email <strong>niyoragifts@gmail.com</strong>, and we will wipe your personal data in accordance with applicable laws.</li></ul><h3>11. Liability Limits</h3><ul><li>Niyora Gifts is not liable for indirect or consequential damages arising from website usage, except as required by law.</li></ul><h3>12. Governing Law</h3><ul><li>These Terms are governed by and construed in accordance with the laws of Delhi, India.</li></ul><h3>Need Help?</h3><p>📧 Email: <strong>niyoragifts@gmail.com</strong><br>📞 Phone: <strong>+91 90000-00000</strong><br>🕒 Support Hours: <strong>Mon–Sat, 10 AM – 6 PM</strong></p>";
      
      policyRecord.publishedContent.termsConditions = termsHtml;
      policyRecord.draftContent.termsConditions = termsHtml;
      
      policyRecord.markModified("publishedContent");
      policyRecord.markModified("draftContent");
      policyRecord.hasDraftChanges = false;
      
      await policyRecord.save();
      console.log("Policies updated successfully.");
    } else {
      console.log("Policies section not found in DB.");
    }

    // 2. Update Footer Section with Terms link
    const footerRecord = await CmsContent.findOne({ section: "footer" });
    if (footerRecord) {
      console.log("Updating footer customer service links in DB...");
      const linkToAdd = { label: "Terms & Conditions", link: "/terms-conditions" };
      
      // Update publishedContent links
      const publishedLinks = footerRecord.publishedContent.customerServiceLinks || [];
      if (!publishedLinks.some(l => l.link === linkToAdd.link)) {
        publishedLinks.push(linkToAdd);
        footerRecord.publishedContent.customerServiceLinks = publishedLinks;
        footerRecord.markModified("publishedContent");
      }

      // Update draftContent links
      const draftLinks = footerRecord.draftContent.customerServiceLinks || [];
      if (!draftLinks.some(l => l.link === linkToAdd.link)) {
        draftLinks.push(linkToAdd);
        footerRecord.draftContent.customerServiceLinks = draftLinks;
        footerRecord.markModified("draftContent");
      }

      footerRecord.hasDraftChanges = false;
      await footerRecord.save();
      console.log("Footer customer service links updated successfully.");
    } else {
      console.log("Footer section not found in DB.");
    }

    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  } catch (error) {
    console.error("Migration error:", error);
  }
}

run();
