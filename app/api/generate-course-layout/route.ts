import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { COURSE_CONFIG_PROMPT } from "@/data/prompt";
import { coursesTable } from "@/config/schema";
import { db } from '@/config/db'
import { currentUser } from "@clerk/nextjs/server";


const apiKey = process.env.GEMINI_API_KEY;
if(!apiKey) {
    throw new Error("GEMINI API KEY is not set environment variables");
}
const genAI = new GoogleGenerativeAI(apiKey);

export const POST = async(req: NextRequest)=> {
    try {
        const { userInput, courseId, type } = await req.json();
        const user=await currentUser();

        if(!userInput) {
            return NextResponse.json({error:"userInput is required"},{status: 400})
        }

        const model = genAI.getGenerativeModel({model:"gemini-2.5-flash"});
        const prompt = `
        ${COURSE_CONFIG_PROMPT}

        COURSE TOPIC:
        ${userInput}

        Return ONLY valid JSON.
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text();

        let cleaned = text.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/```json|```/g, "").trim();
        }

        const json = JSON.parse(cleaned);

        //Save to DB
        const courseResult=await db.insert(coursesTable).values({
            courseId: courseId,
            courseName: json.courseName,
            userInput: userInput,
            type: type,
            courseLayout: json,
            userId: user?.primaryEmailAddress?.emailAddress||''
        }).returning();

        /*return NextResponse.json({
            ok: true,
            data: json,
        });*/

        return NextResponse.json(courseResult[0]);

    } catch (error) {
        console.error("Error: ",error);
    }

}

