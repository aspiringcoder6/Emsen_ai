import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  completeCreatorDnaOnboarding,
  createCreatorDnaSignal,
  getCreatorDna,
  removeCreatorDnaSignal,
  saveCreatorDnaOnboarding,
} from "../features/creator-dna/creatorDnaApi";
import { creatorDnaQuestions } from "../features/creator-dna/creatorDnaConfig";
import { creatorDnaUpdatedEvent } from "../features/chat/chatConfig";
import type {
  CreatorDnaLearningSource,
  CreatorDnaProfile,
  CreatorDnaQuestion,
  CreatorDnaSignalSuggestion,
  CreatorDnaState,
} from "../features/creator-dna/creatorDnaTypes";
import { CreatorDnaComplete } from "../features/creator-dna/components/CreatorDnaComplete";
import { CreatorDnaIntro } from "../features/creator-dna/components/CreatorDnaIntro";
import { CreatorDnaLearningLoop } from "../features/creator-dna/components/CreatorDnaLearningLoop";
import { CreatorDnaQuestionCard } from "../features/creator-dna/components/CreatorDnaQuestionCard";

type CreatorDnaPageProps = {
  onStartCreating: () => void;
};

type AnswerValue = string | string[];

function hasAnswer(value: AnswerValue) {
  return Array.isArray(value) ? value.length > 0 : value.trim().length > 0;
}

export function CreatorDnaPage({ onStartCreating }: CreatorDnaPageProps) {
  const [state, setState] = useState<CreatorDnaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const loadCreatorDna = async () => {
    setLoading(true);
    setError("");
    try {
      setState(await getCreatorDna());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải Creator DNA từ máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCreatorDna();
  }, []);

  useEffect(() => {
    const reloadAfterChatLearning = () => void loadCreatorDna();
    window.addEventListener(creatorDnaUpdatedEvent, reloadAfterChatLearning);
    return () =>
      window.removeEventListener(creatorDnaUpdatedEvent, reloadAfterChatLearning);
  }, []);

  useEffect(() => {
    if (!state || state.status === "completed") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveCreatorDnaOnboarding({
        currentStep: state.currentStep,
        profile: state.profile,
        status: state.status,
      }).catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Chưa thể lưu tiến độ Creator DNA.",
        );
      });
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [state]);

  if (loading) {
    return (
      <section className="grid min-h-[520px] place-items-center rounded-[28px] border border-[#DDEBD6] bg-white">
        <div className="text-center">
          <RefreshCw className="mx-auto animate-spin text-[#46A82D]" size={30} />
          <p className="mt-4 text-sm font-bold text-[#607760]">Đang tải Creator DNA…</p>
        </div>
      </section>
    );
  }

  if (!state) {
    return (
      <section className="grid min-h-[460px] place-items-center rounded-[28px] border border-[#DDEBD6] bg-white px-6 text-center">
        <div>
          <AlertCircle className="mx-auto text-[#46A82D]" size={34} />
          <h2 className="mt-4 text-xl font-bold text-[#284D31]">Chưa thể mở Creator DNA</h2>
          <p className="mt-2 text-sm text-[#748A74]">{error}</p>
          <button
            className="mt-5 rounded-xl bg-[#46A82D] px-5 py-2.5 text-sm font-bold text-white"
            onClick={() => void loadCreatorDna()}
            type="button"
          >
            Thử lại
          </button>
        </div>
      </section>
    );
  }

  const question = creatorDnaQuestions[state.currentStep] ?? creatorDnaQuestions[0]!;
  const value = state.profile[question.id];

  const updateAnswer = (answer: AnswerValue) => {
    setError("");
    setState((current) =>
      current
        ? {
            ...current,
            profile: {
              ...current.profile,
              [question.id]: answer,
            } as CreatorDnaProfile,
            insight: null,
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  };

  const finishOnboarding = async (profile: CreatorDnaProfile) => {
    setAnalyzing(true);
    setError("");
    try {
      setState(await completeCreatorDnaOnboarding(profile));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Chưa thể đánh giá Creator DNA.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const goToNextQuestion = () => {
    const lastQuestion = state.currentStep === creatorDnaQuestions.length - 1;
    if (lastQuestion) {
      void finishOnboarding(state.profile);
      return;
    }

    setState((current) =>
      current
        ? {
            ...current,
            currentStep: current.currentStep + 1,
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  };

  const startOnboarding = () => {
    setState((current) =>
      current
        ? {
            ...current,
            status: "in-progress",
            currentStep: 0,
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  };

  const skipOnboarding = () => {
    setState((current) =>
      current
        ? {
            ...current,
            status: "skipped",
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  };

  const goBack = () => {
    setState((current) =>
      current
        ? {
            ...current,
            status: current.currentStep === 0 ? "not-started" : current.status,
            currentStep: Math.max(0, current.currentStep - 1),
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  };

  const editAnswers = () => {
    setState((current) =>
      current
        ? {
            ...current,
            status: "in-progress",
            currentStep: 0,
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  };

  const confirmLearningSignal = async (
    source: CreatorDnaLearningSource,
    suggestion: CreatorDnaSignalSuggestion,
  ) => {
    setError("");
    try {
      setState(
        await createCreatorDnaSignal({
          ...suggestion,
          source,
        }),
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Chưa thể lưu tín hiệu.";
      setError(message);
      throw requestError;
    }
  };

  const removeLearningSignal = async (signalId: string) => {
    setError("");
    try {
      setState(await removeCreatorDnaSignal(signalId));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Chưa thể gỡ tín hiệu.",
      );
    }
  };

  const learningLoop = (
    <CreatorDnaLearningLoop
      learning={state.learning}
      onConfirmSignal={confirmLearningSignal}
      onRemoveSignal={removeLearningSignal}
      profile={state.profile}
    />
  );
  const errorBanner = error ? (
    <div className="flex items-start gap-3 rounded-2xl border border-[#FFD2D2] bg-[#FFF4F4] px-4 py-3 text-sm font-semibold text-[#B83F3F]">
      <AlertCircle className="mt-0.5 shrink-0" size={17} />
      {error}
    </div>
  ) : null;

  if (state.status === "not-started") {
    return (
      <div className="space-y-5">
        {errorBanner}
        <CreatorDnaIntro
          insight={state.insight}
          onSkip={skipOnboarding}
          onStart={startOnboarding}
        />
      </div>
    );
  }

  if (state.status === "skipped") {
    return (
      <div className="space-y-5">
        {errorBanner}
        <CreatorDnaIntro
          deferred
          insight={state.insight}
          onContinue={onStartCreating}
          onSkip={skipOnboarding}
          onStart={startOnboarding}
        />
        {learningLoop}
      </div>
    );
  }

  if (state.status === "completed" || analyzing) {
    return (
      <div className="space-y-5">
        {errorBanner}
        <CreatorDnaComplete
          analyzing={analyzing}
          insight={state.insight}
          onEdit={editAnswers}
          onStartCreating={onStartCreating}
          profile={state.profile}
        />
        {!analyzing ? learningLoop : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {errorBanner}
      <CreatorDnaQuestionCard
        canContinue={hasAnswer(value)}
        currentStep={state.currentStep}
        onBack={goBack}
        onChange={updateAnswer}
        onContinue={goToNextQuestion}
        onSkipOnboarding={skipOnboarding}
        onSkipQuestion={goToNextQuestion}
        profile={state.profile}
        question={question as CreatorDnaQuestion}
        totalSteps={creatorDnaQuestions.length}
        value={value}
      />
    </div>
  );
}
