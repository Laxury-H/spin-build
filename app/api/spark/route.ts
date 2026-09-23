import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      "https://v2.jokeapi.dev/joke/Programming,Miscellaneous?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=single",
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      },
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.joke === "string") {
        const text = data.joke.trim();
        const tags = [data.category?.toLowerCase() || "humor"];
        return NextResponse.json({ text, tags }, { status: 200 });
      }
    }
  } catch {
    // Graceful fallback
  }

  return NextResponse.json(
    {
      text: "There are only 10 types of people in the world: those who understand binary and those who don't.",
      tags: ["programming", "binary"],
    },
    { status: 200 },
  );
}
