// Minimal Express server for the /contact form used by src/components/Contact.astro.
// This mirrors the original project's server.js but reads credentials from
// environment variables instead of hardcoding them in source control.
//
// Setup:
//   1. cp .env.example .env
//   2. fill in EMAIL_USER / EMAIL_PASS (use a Gmail App Password, not your login password)
//   3. npm install
//   4. npm start

import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const TO_EMAIL = process.env.CONTACT_TO_EMAIL || process.env.EMAIL_USER;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("Mail transport not ready:", error.message);
  } else {
    console.log("Mail transport ready.");
  }
});

app.post("/contact", async (req, res) => {
  const { firstName = "", lastName = "", email = "", phone = "", message = "" } = req.body ?? {};

  if (!email || !message) {
    return res.status(400).json({ code: 400, status: "Missing required fields" });
  }

  const mail = {
    from: `${firstName} ${lastName}`.trim() || email,
    to: TO_EMAIL,
    subject: "Contact Form Submission - Mangonanas Miniatures",
    html: `<p>Name: ${firstName} ${lastName}</p>
           <p>Email: ${email}</p>
           <p>Phone: ${phone}</p>
           <p>Message: ${message}</p>`,
  };

  try {
    await transporter.sendMail(mail);
    res.json({ code: 200, status: "Message Sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ code: 500, status: "Failed to send message" });
  }
});

app.listen(PORT, () => console.log(`Contact server running on port ${PORT}`));
