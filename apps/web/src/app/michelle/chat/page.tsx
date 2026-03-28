import { redirect } from "next/navigation";

export default function MichelleChatPage() {
  // Web版チャットはLINE BOTに移行済み
  redirect("/michelle-lp");
}
