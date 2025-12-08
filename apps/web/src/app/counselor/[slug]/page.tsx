import { CounselorPage } from "./profile-client";

type Props = {
  params: {
    slug: string;
  };
};

export default function CounselorProfilePage({ params }: Props) {
  return <CounselorPage slug={params.slug} />;
}
