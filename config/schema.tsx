import { timeStamp } from "console";
import { integer, pgTable, varchar, timestamp, json, text  } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  credits: integer().default(2)
});


export const coursesTable = pgTable("courses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar({length:255}).notNull().references(()=>usersTable.email),
  courseId: varchar({length:255}).notNull().unique(),
  courseName: varchar({length:255}).notNull(),
  userInput: varchar({length:100}).notNull(),
  type: varchar({length:100}).notNull(),
  courseLayout: json(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chapterContentSlides = pgTable("chapter_content_slides",{
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  courseId: varchar({length:255}).notNull().references(() => coursesTable.courseId), //YANLIŞ OLABİLİR
  chapterId: varchar({length:255}).notNull(),
  slideId: varchar({length:255}).notNull(),
  slideIndex: integer().notNull(),
  audioFileName: varchar({length:255}).notNull(),
  caption: json().notNull(),
  audioFileUrl: varchar({length:1024}).notNull(),
  narration: json().notNull(),
  html: text(),
  revelData: json().notNull()
});
