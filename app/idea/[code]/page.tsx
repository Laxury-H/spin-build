import { notFound } from "next/navigation";
import { ideaFromCode } from "@/lib/generator";
import { IdeaClientView } from "./client-view";

export default async function SharedIdeaPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const idea = ideaFromCode(code);

  if (!idea) {
    notFound();
  }

  return <IdeaClientView idea={idea} />;
}
