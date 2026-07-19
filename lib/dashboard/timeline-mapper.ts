export interface IntakeAnswerLike {
  questionId: string;
  questionText: string;
  answerText: string;
  answerType: string;
  sequence: number;
}

export interface IntakeTimelineItem {
  id: string;
  dateLabel: string;
  title: string;
  description: string;
  source: "user-provided";
  isApproximate: boolean;
}

const TEMPORAL_KEYWORDS = [
  "when",
  "date",
  "trial",
  "sentenc",
  "convict",
  "filed",
  "appeal",
  "order",
  "hearing",
  "arrest",
  "charge",
];

function isTimelineWorthy(questionText: string): boolean {
  const lower = questionText.toLowerCase();
  return TEMPORAL_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function isDontKnow(answerText: string): boolean {
  return answerText.trim().toLowerCase() === "i don't know";
}

/** Formats a strict ISO (YYYY-MM-DD) date string, or null if it isn't one — never guesses at a date from free text. */
function formatExactDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const date = new Date(`${value.trim()}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/**
 * Builds a timeline from confirmed IntakeAnswer rows only — never from
 * AI-inferred content. A `date`-type answer becomes an exact entry when
 * it parses as ISO; anything else that reads as timing-relevant becomes
 * an approximate, explicitly "Date not provided" entry rather than a
 * guessed date. Non-temporal facts and "I don't know" answers are
 * intentionally excluded — this is a timeline, not a full answer log.
 */
export function buildIntakeTimeline(answers: IntakeAnswerLike[]): IntakeTimelineItem[] {
  const items: IntakeTimelineItem[] = [];

  for (const answer of answers) {
    if (!answer || !answer.questionText || !answer.answerText || !answer.questionId) continue;
    if (isDontKnow(answer.answerText)) continue;

    if (answer.answerType === "date") {
      const formatted = formatExactDate(answer.answerText);
      items.push({
        id: answer.questionId,
        dateLabel: formatted ?? "Date not provided",
        title: answer.questionText,
        description: answer.answerText,
        source: "user-provided",
        isApproximate: formatted === null,
      });
      continue;
    }

    if (isTimelineWorthy(answer.questionText)) {
      items.push({
        id: answer.questionId,
        dateLabel: "Date not provided",
        title: answer.questionText,
        description: answer.answerText,
        source: "user-provided",
        isApproximate: true,
      });
    }
  }

  return items.sort((a, b) => {
    const seqA = answers.find((ans) => ans?.questionId === a.id)?.sequence ?? 0;
    const seqB = answers.find((ans) => ans?.questionId === b.id)?.sequence ?? 0;
    return seqA - seqB;
  });
}
