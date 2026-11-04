import { createFileRoute } from "@tanstack/react-router";
import { EclatGame } from "@/components/EclatGame";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <EclatGame />;
}
