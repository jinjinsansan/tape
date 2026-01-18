"use client";

import { memo } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SelfEsteemQuestion } from "@/lib/self-esteem/types";

const SCALE_OPTIONS = [
  { value: 1, label: "全くそう思わない" },
  { value: 2, label: "あまりそう思わない" },
  { value: 3, label: "どちらでもない" },
  { value: 4, label: "ややそう思う" },
  { value: 5, label: "とてもそう思う" }
];

type DiaryAssistantTestStepProps = {
  questions: SelfEsteemQuestion[] | null;
  answers: Record<string, number>;
  onSelectAnswer: (questionId: string, value: number) => void;
  onSubmit: () => void;
  submitting?: boolean;
};

const Component = ({ questions, answers, onSelectAnswer, onSubmit, submitting }: DiaryAssistantTestStepProps) => {
  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6c554b]">各設問について、いまの気持ちに最も近い選択肢をタップしてください。</p>
      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id} className="border-[#f5e6dd] bg-white">
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold text-rose-400">Q{index + 1}</p>
              <p className="text-sm text-[#5a473f]">{question.text}</p>
              <div className="space-y-2">
                {SCALE_OPTIONS.map((option) => (
                  <Button
                    key={`${question.id}-${option.value}`}
                    type="button"
                    variant={answers[question.id] === option.value ? "default" : "outline"}
                    className={cn(
                      "w-full justify-start rounded-2xl text-left text-sm",
                      answers[question.id] === option.value
                        ? "bg-tape-pink text-white"
                        : "border-rose-100 text-[#5a473f]"
                    )}
                    onClick={() => onSelectAnswer(question.id, option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button onClick={onSubmit} disabled={submitting} className="rounded-full bg-tape-pink text-white">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "スコアを反映する"}
      </Button>
    </div>
  );
};

export const DiaryAssistantTestStep = memo(Component);
