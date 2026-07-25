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

    // Update Policies Section
    const policyRecord = await CmsContent.findOne({ section: "policies" });
    if (policyRecord) {
      console.log("Updating policies section in DB...");
      policyRecord.publishedContent.refundPolicy = "<h2>Returns, Refunds & Replacement Policy</h2><p><strong>Niyora Gifts</strong></p><p>At Niyora Gifts, we want you to love every gift you order! If something isn't right, we're happy to help with a return, replacement, or refund — subject to the conditions below.</p><h3>Return & Replacement Eligibility</h3><ul><li>Returns or replacements are accepted only if the request is raised within <strong>7 days</strong> of delivery.</li><li>The product must be <strong>unused, unwashed, and undamaged</strong>, with all original tags, packaging, and accessories intact.</li><li>The product must be sent back to us in its <strong>original condition</strong> — exactly as it was delivered. Items that appear used, altered, or damaged by the customer will not be eligible for return or replacement.</li><li>Products must be returned in their <strong>original packaging/box</strong> (including any gift box, wrapping, or inserts that came with it), as this helps us process your return smoothly.</li><li>Customized or personalized gifts (engraved names, custom photos, made-to-order items, etc.) are <strong>not eligible for return or replacement</strong>, unless the product is defective or damaged.</li></ul><h3>How the Return/Replacement Process Works</h3><ol><li><strong>Raise a Request:</strong> Contact our support team at <strong>niyoragifts@gmail.com</strong> or <strong>+91 90000-00000</strong> within <strong>7 days</strong> of delivery, with your order number and reason for return/replacement (add photos if the product is damaged or incorrect).</li><li><strong>Approval:</strong> Our team will review your request and confirm if it qualifies under this policy.</li><li><strong>Ship the Product Back:</strong> Once approved, Niyora Gifts will arrange a reverse pickup (available in most pin codes). If reverse pickup is not available in your location, our support team will guide you on self-shipping, and we will reimburse reasonable shipping costs upon receipt of a valid shipping bill.</li><li><strong>Quality Check:</strong> Once the returned product reaches our store, our team will inspect it to confirm it is unused and in its original condition.</li><li><strong>Refund/Replacement Processed:</strong> After the product passes our quality check, we will process your <strong>replacement</strong> (dispatch of the new item) or <strong>refund</strong>, as applicable.</li></ol><p>⚠️ <em>Please note: Refunds and replacements are initiated <strong>only after the returned product is received and inspected at our store</strong>, not at the time of pickup or dispatch from your end.</em></p><h3>Refunds</h3><ul><li>Once your returned product is received and approved, your refund will be processed within <strong>5–7 business days</strong>.</li><li>Refunds will be credited to your <strong>original payment method</strong>.</li><li>Shipping charges (if any were paid at the time of order) are <strong>non-refundable</strong>, unless the return is due to our error (wrong/damaged/defective item).</li></ul><h3>Replacements</h3><ul><li>Replacement requests are subject to <strong>stock availability</strong>. If the same product is unavailable, we will offer a refund or an alternative product of equal value.</li><li>Once your original product is received and inspected, the replacement item will be dispatched within <strong>3–5 business days</strong>.</li></ul><h3>Non-Returnable Items</h3><p>The following items cannot be returned or replaced:</p><ul><li>Personalized/customized gifts</li><li>Perishable items (e.g., chocolates, flowers, edible gifts) — unless damaged or defective on arrival</li><li>Items marked as \"Final Sale\" or purchased during clearance/sale</li><li>Gift cards or vouchers</li></ul><h3>Damaged, Defective, or Wrong Item Received</h3><p>If you receive a damaged, defective, or incorrect product, please contact us within <strong>48 hours of delivery</strong> with clear photos/videos of the product and packaging at <strong>niyoragifts@gmail.com</strong>. In such cases, Niyora Gifts will bear the return shipping cost and prioritize a replacement or full refund.</p><h3>Important Notes</h3><ul><li>Any return sent to us <strong>without prior approval/request</strong> may not be accepted.</li><li>Products returned in used, damaged, or altered condition (not matching their original delivered state) will be sent back to the customer, and no refund/replacement will be issued.</li><li>Processing times may vary slightly during sale periods or high-order volumes.</li></ul><h3>Need Help?</h3><p>For any questions about returns, refunds, or replacements, reach out to us:</p><p>📧 Email: <strong>niyoragifts@gmail.com</strong><br>📞 Phone: <strong>+91 90000-00000</strong><br>🕒 Support Hours: <strong>Mon–Sat, 10 AM – 6 PM</strong></p>";
      policyRecord.draftContent.refundPolicy = policyRecord.publishedContent.refundPolicy;
      policyRecord.hasDraftChanges = false;
      await policyRecord.save();
      console.log("Policies updated successfully.");
    }

    // Update About Section
    const aboutRecord = await CmsContent.findOne({ section: "about" });
    if (aboutRecord) {
      console.log("Updating about section in DB...");
      aboutRecord.publishedContent.heading = "Welcome to Niyora Gifts";
      aboutRecord.publishedContent.description = "At Niyora Gifts, we believe every gift tells a story. What started as a simple idea — to make gifting easier, more meaningful, and more personal — has grown into a trusted online gift store loved by customers who want to celebrate life's special moments in style. Whether you're looking for a birthday gift, an anniversary surprise, a wedding present, or a thoughtful token for a loved one, Niyora Gifts brings you a carefully curated collection designed to make every occasion unforgettable.";
      aboutRecord.publishedContent.companyStory = "<p>Niyora Gifts was founded with one simple mission: <strong>to bring joy through thoughtful gifting</strong>. We noticed how difficult it can be to find the perfect gift — something unique, meaning, and delivered on time. So, we set out to build an online gifting destination that combines <strong>quality products, affordable prices, and a seamless shopping experience</strong>.</p><p>Today, Niyora Gifts is proud to serve customers across Delhi and all of India with a growing range of gifts for birthdays, anniversaries, weddings, festivals, and everyday \"just because\" moments.</p>";
      
      aboutRecord.draftContent.heading = aboutRecord.publishedContent.heading;
      aboutRecord.draftContent.description = aboutRecord.publishedContent.description;
      aboutRecord.draftContent.companyStory = aboutRecord.publishedContent.companyStory;

      aboutRecord.seo.title = "About Niyora Gifts | Online Gift Store for Every Occasion";
      aboutRecord.seo.description = "Discover the story behind Niyora Gifts — your trusted online gift shop for personalized, unique, and thoughtful gifts. Shop with confidence, delivered with love.";
      aboutRecord.seo.keywords = "Niyora Gifts, online gift store, personalized gifts, gift shop, buy gifts online";
      aboutRecord.seo.ogTitle = "About Niyora Gifts | Online Gift Store for Every Occasion";
      aboutRecord.seo.ogDescription = "Discover the story behind Niyora Gifts — your trusted online gift shop for personalized, unique, and thoughtful gifts.";

      aboutRecord.draftSeo = { ...aboutRecord.seo };
      aboutRecord.hasDraftChanges = false;
      
      await aboutRecord.save();
      console.log("About updated successfully.");
    }

    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  } catch (error) {
    console.error("Migration error:", error);
  }
}

run();
