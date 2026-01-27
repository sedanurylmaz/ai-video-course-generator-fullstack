import { db } from "@/config/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { usersTable } from "@/config/schema";
import { NextRequest } from "next/server";

export async function POST(req:NextRequest) {
    const user=await currentUser();

    console.log("🔥 /api/user HIT");
    console.log("👤 user:", user?.id);
    console.log("📧 email:", user?.primaryEmailAddress?.emailAddress);

      if (!user || !user.primaryEmailAddress?.emailAddress) {
        return NextResponse.json({ error: "Unauthorized/no email" }, { status: 401 });
    }

    // if user  aldready exists in DB
    const users = await db.select().from(usersTable)
        .where(eq(usersTable.email,user?.primaryEmailAddress?.emailAddress as string))

    // if not create a user in DB
    if(users?.length==0) {
        const newUser = await db.insert(usersTable).values({
            email:user?.primaryEmailAddress?.emailAddress as string,
            name: user?.fullName as string,
        }).returning();

        return NextResponse.json(newUser[0]);
    }

    return NextResponse.json(users[0]);
}

