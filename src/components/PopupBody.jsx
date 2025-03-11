import React, {useEffect, useState} from "react";
import styled from "styled-components";
import {GeminiChatSession} from "../services/GeminiAIModel";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPaperclip, faCircleXmark} from "@fortawesome/free-solid-svg-icons";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

//for local
pdfjsLib.GlobalWorkerOptions.workerSrc = "/workers/pdf.worker.js";
//for chrome extension
// pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
//   "workers/pdf.worker.js"
// );

const StyledTextArea = styled("textarea")({
  resize: "none",
  padding: "5px 8px",
  width: "100%",
  height: "52px",
  border: "2px solid black",
  borderRadius: "10px",
  fontSize: "1rem",
  lineHeight: 1.2,
  boxSizing: "border-box",
});

function PopupBody() {
  const [jobDescription, setJobDescription] = useState("");
  const [recruitersEmail, setRecruitersEmail] = useState("");
  const [generatedEmails, setGeneratedEmails] = useState([]);
  const [mailSubject, setMailSubject] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeName, setResumeName] = useState("");
  const [buttonName, setButtonName] = useState(
    generatedEmails.length > 0 ? "Send" : "Generate Email"
  );

  useEffect(() => {
    if (resumeFile) {
      setResumeName(resumeFile.name);
    } else {
      setResumeName("");
    }
  }, [resumeFile, generatedEmails]);

  const extractTextFromPDF = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const typedArray = new Uint8Array(reader.result);
          const loadingTask = pdfjsLib.getDocument({data: typedArray});
          const pdf = await loadingTask.promise;

          if (!pdf) {
            return;
          }

          let extractedText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Extract text from the page
            const pageText = textContent.items
              .map((item) => item.str)
              .join(" ");
            extractedText += `Page ${i}: ${pageText}\n\n`;
          }

          resolve(extractedText);
        } catch (error) {
          reject(new Error("Error processing the PDF: " + error.message));
        }
      };

      reader.onerror = () => {
        reject(new Error("Error reading the PDF file."));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const generateEmails = async () => {
    let resumeText;
    if (resumeFile) {
      resumeText = await extractTextFromPDF(resumeFile);
    }

    const prompt = `Resume:\n${resumeText}\nJob description: ${jobDescription}.\n\nGo through my resume and the job description and write a job application email for the above Job description withing 15 lines. Do not forget to add regards along with my email, mobile number, mobile number, Linkedin id and portfolio link. Keep the following points in mind:
    1) Please do not use placeholders [] for replaceable value.
    2) Do not keep line gaps between regards, name, email, mobile number, Linkedin id and portfolio link.
    3) Do not add Subject.
    4) Do not forget to add portfolio and Linkedin link if it is present in the resume.
    5) Give the response in HTML format with propper formatting.
    6) Skill should be in bold tag.
    7) Give the response in raw html format only, not in markdown format.
    8) Links should be clickable.
    9) No extra line gaps in the "Regards" section. Regards section should be in a single <p> tga. For line break use <br> instead.`;
    //const prompt = `Job description: ${jobDescription}.\n\nGo through the job description and write a job application email withing 10 lines. Please hightlight my skills in bold, do not forget to add regards along wwith my email and mobile number (not in same line) and please do not use placeholders [] for replaceable value.`;
    const result = await GeminiChatSession.sendMessage(prompt);
    let generatedEmail = result.response.text();

    // ✅ Remove Markdown code block markers (```html ... ```)
    generatedEmail = generatedEmail
      .replace(/```html\s*([\s\S]*?)```/g, "$1")
      .trim();
    generatedEmail = generatedEmail.replace(/```([\s\S]*?)```/g, "$1").trim();

    // ✅ Convert Markdown bold (`**bold**`) to HTML bold (`<b>bold</b>`)
    generatedEmail = generatedEmail.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

    const mailSubjectPROMPT = `Resume:\n${resumeText}\nJob description: ${jobDescription}.\n\nGo through my resume and the job description and write Subject for the job application email.`;
    const mailSubject = await GeminiChatSession.sendMessage(mailSubjectPROMPT);
    setMailSubject(mailSubject);

    setGeneratedEmails((prevEmails) => [...prevEmails, generatedEmail]);
  };

  const sendEmail = (email, subject, body) => {
    if (!window.confirm(`Send email to ${email}?`)) {
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: "sendEmail",
        to: email,
        subject: subject,
        body: body,
      },
      (response) => {
        if (response?.success) {
          alert("Email sent successfully!");
        } else {
          alert("Failed to send email.");
        }
      }
    );
  };

  return (
    <>
      <h3
        style={{
          margin: "10px 0",
        }}
      >
        TalentPitch
      </h3>
      <div
        style={{
          width: "300px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: "12px",
          fontSize: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            padding: "5px 10px",
            textAlign: "center",
            border: "2px solid black",
            borderRadius: "10px",
            marginBottom: "10px",
            boxSizing: "border-box",
            gap: "10px",
          }}
        >
          <span
            style={{
              color: resumeName ? "black" : "#888",
            }}
          >
            {resumeName || "Upload Resume"}
          </span>
          {resumeName ? (
            <span
              onClick={() => setResumeFile(null)}
              style={{
                cursor: "pointer",
              }}
            >
              <FontAwesomeIcon
                icon={faCircleXmark}
                style={{fontSize: "20px", color: "#ea2a2a"}}
              />
            </span>
          ) : (
            <span>
              <label htmlFor="resume-upload" style={{cursor: "pointer"}}>
                <FontAwesomeIcon
                  icon={faPaperclip}
                  style={{fontSize: "20px", color: "black"}}
                />
              </label>
              <input
                id="resume-upload"
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  setResumeFile(e.target.files[0]);
                }}
                style={{display: "none"}}
              />
            </span>
          )}
        </div>

        <StyledTextArea
          id="jobDescription"
          placeholder="Company:Amazon, Role:FE dev, Skills:React.js, JS"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        <input
          type="email"
          placeholder="Enter recruiter's email"
          value={recruitersEmail}
          onChange={(e) => setRecruitersEmail(e.target.value)}
          style={{
            padding: "5px 8px",
            width: "100%",
            border: "2px solid black",
            borderRadius: "10px",
            fontSize: "1rem",
            lineHeight: 1.2,
            boxSizing: "border-box",
          }}
        />

        {/* {generatedEmails.length > 0 && <p>{generatedEmails[0]}</p>} */}

        <button
          style={{
            width: "100%",
            borderRadius: "10px",
            padding: "5px 8px",
            color: "white",
            backgroundColor: "#33adff",
          }}
          onClick={generateEmails}
        >
          {buttonName}
        </button>

        <button
          onClick={() =>
            sendEmail(recruitersEmail, mailSubject, generatedEmails[0])
          }
          style={{
            width: "100%",
            padding: "5px",
            backgroundColor: "#2196F3",
            color: "white",
            marginTop: "5px",
          }}
        >
          Send Email
        </button>
      </div>
    </>
  );
}

export default PopupBody;
