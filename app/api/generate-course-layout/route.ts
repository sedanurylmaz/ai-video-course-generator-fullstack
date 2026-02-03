import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { COURSE_CONFIG_PROMPT } from "@/data/prompt";
import { coursesTable } from "@/config/schema";
import { db } from '@/config/db'
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";


const apiKey = process.env.GEMINI_API_KEY;
if(!apiKey) {
    throw new Error("GEMINI API KEY is not set environment variables");
}
const genAI = new GoogleGenerativeAI(apiKey);

export const POST = async(req: NextRequest)=> {
    try {
        const { userInput, courseId, type } = await req.json();
        const user=await currentUser();
        const { has }=await auth();

        const isPaidUser = has({ plan: 'monthly' })

        if(!isPaidUser)
        {
            const userCourses=await db.select().from(coursesTable)
            .where(eq(coursesTable.userId,user?.primaryEmailAddress?.emailAddress as string));

            if(userCourses?.length>=2)
            {
                return NextResponse.json({ msg: 'max limit' });
            }
        }

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

        const safeUserInput =
            userInput.length > 100 ? userInput.slice(0, 100) : userInput;


        //Save to DB
        const courseResult=await db.insert(coursesTable).values({
            courseId: courseId,
            courseName: json.courseName,
            userInput: safeUserInput,
            type: type,
            courseLayout: json,
            userId: user?.primaryEmailAddress?.emailAddress||"",
        }).returning();

        return NextResponse.json(courseResult[0]);

    } catch (error) {
        console.error("Error: ",error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
         );
    }

}