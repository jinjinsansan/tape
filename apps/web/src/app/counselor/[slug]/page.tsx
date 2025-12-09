import { CounselorPage } from "./profile-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  params: {
    slug: string;
  };
};

export default function CounselorProfilePage({ params }: Props) {
  return (
    <div className="min-h-screen bg-tape-cream px-4 py-12 md:px-8">
      <header className="mx-auto max-w-5xl mb-8">
        <Link href="/counselor" className="inline-block">
          <Button variant="ghost" size="sm" className="mb-2">
            <ChevronLeft className="mr-1 h-4 w-4" />
            一覧に戻る
          </Button>
        </Link>
      </header>
      <CounselorPage slug={params.slug} />
    </div>
  );
}
