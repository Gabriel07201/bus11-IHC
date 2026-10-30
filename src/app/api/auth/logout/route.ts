import { NextResponse } from "next/server";
import { RESEARCHER_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(RESEARCHER_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}
