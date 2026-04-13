import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY is not set. AI features will not work.");
}

const genAI = new GoogleGenAI({ apiKey: apiKey || "" });

interface GenerateDescriptionParams {
  title: string;
  descriptionType: string;
  writingStyle: string;
  structure: string;
  intentFilter: string;
}

export async function generateTaskDescription({
  title,
  descriptionType,
  writingStyle,
  structure,
  intentFilter,
}: GenerateDescriptionParams): Promise<string> {
  const prompt = `Generate a task description for a task management app with the title ${title} and description type ${descriptionType}. 
  the writing style should be ${writingStyle} and the structure should be ${structure} and the intent should be ${intentFilter}. 
  Generate only the description text, no additional commentary or labels.`;

  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text ?? "";
}
