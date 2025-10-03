import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public", "animals");
    const files = await fs.readdir(dir);
    const urls = files
      .filter((f) => /\.(gif|webp|apng|png)$/i.test(f))
      .map((f) => `/animals/${f}`);
    return NextResponse.json({ urls });
  } catch {
    return NextResponse.json({ urls: [] });
  }
}
