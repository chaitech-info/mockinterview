export type QuestionCategory = "Behavioral" | "Technical" | "Situational" | "Culture-fit";

export const jdAnalysisMock = {
  role: "Senior Product Manager",
  company: "Stripe",
  seniority: "Senior",
  topSkills: [
    "Product strategy",
    "Stakeholder management",
    "Data analysis",
    "Cross-functional leadership",
    "Roadmap planning",
  ],
  questionCounts: {
    Behavioral: 4,
    Technical: 4,
    Situational: 2,
    "Culture-fit": 2,
  } as const,
  totalQuestions: 12,
};

export type InterviewQuestion = {
  id: number;
  category: QuestionCategory;
  prompt: string;
};

export const interviewQuestionsMock: InterviewQuestion[] = [
  {
    id: 1,
    category: "Behavioral",
    prompt:
      "Tell me about a time you had to deliver results with incomplete information. How did you decide what to do next?",
  },
  {
    id: 2,
    category: "Technical",
    prompt:
      "How would you evaluate whether a new onboarding flow is improving activation? Walk through metrics, instrumentation, and an experiment plan.",
  },
  {
    id: 3,
    category: "Behavioral",
    prompt:
      "Tell me about a time you had to align multiple stakeholders on a controversial product decision. What was your approach and what was the outcome?",
  },
  {
    id: 4,
    category: "Situational",
    prompt:
      "Your team shipped a feature and engagement is flat. What do you do in the first week to diagnose and iterate?",
  },
  {
    id: 5,
    category: "Technical",
    prompt:
      "Explain how you would build a dashboard for payment failures. What data would you need and what slices matter most?",
  },
  {
    id: 6,
    category: "Culture-fit",
    prompt:
      "What type of feedback helps you perform at your best, and how do you prefer to receive it?",
  },
  {
    id: 7,
    category: "Behavioral",
    prompt:
      "Describe a time you influenced without authority. What was the context and what did you learn?",
  },
  {
    id: 8,
    category: "Technical",
    prompt:
      "How do you choose the right success metric for a product? Share an example and the trade-offs you considered.",
  },
  {
    id: 9,
    category: "Situational",
    prompt:
      "A key partner wants a custom feature that derails your roadmap. How do you respond and what options do you propose?",
  },
  {
    id: 10,
    category: "Behavioral",
    prompt:
      "Tell me about a time you made a mistake in a product decision. How did you handle it and what changed afterward?",
  },
  {
    id: 11,
    category: "Technical",
    prompt:
      "How would you measure the quality of an AI assistant feature? Discuss precision/recall proxies, user trust, and monitoring.",
  },
  {
    id: 12,
    category: "Culture-fit",
    prompt:
      "What motivates you in your work, and what kind of environment helps you thrive?",
  },
];

export type QuestionScoreRow = {
  id: number;
  category: QuestionCategory;
  score: number;
  feedback: string;
};

export const questionScoresMock: QuestionScoreRow[] = [
  { id: 1, category: "Behavioral", score: 8.0, feedback: "Clear structure and strong ownership." },
  { id: 2, category: "Technical", score: 6.0, feedback: "Good direction; add tighter metrics and guardrails." },
  { id: 3, category: "Behavioral", score: 7.0, feedback: "Solid stakeholder framing; quantify the impact." },
  { id: 4, category: "Situational", score: 7.5, feedback: "Good diagnosis steps; prioritize faster learning loops." },
  { id: 5, category: "Technical", score: 6.4, feedback: "Relevant slices; add deeper error taxonomy." },
  { id: 6, category: "Culture-fit", score: 7.0, feedback: "Thoughtful answer; add a concrete example." },
  { id: 7, category: "Behavioral", score: 8.4, feedback: "Strong influence tactics and empathy." },
  { id: 8, category: "Technical", score: 6.8, feedback: "Good trade-offs; sharpen the north-star choice." },
  { id: 9, category: "Situational", score: 7.2, feedback: "Balanced options; clarify decision criteria." },
  { id: 10, category: "Behavioral", score: 8.1, feedback: "Great reflection and learning mindset." },
  { id: 11, category: "Technical", score: 6.2, feedback: "Good monitoring; expand on evaluation design." },
  { id: 12, category: "Culture-fit", score: 7.0, feedback: "Aligned motivations; be more specific." },
];

export const reportMock = {
  grade: "B+",
  overallScore: 7.2,
  subtext: "Above average — strong candidate with clear areas to improve",
  metrics: {
    Behavioral: 8.1,
    Technical: 6.4,
    Situational: 7.5,
    "Culture-fit": 7.0,
  } as const,
  strengths: [
    "Strong communication of complex decisions",
    "Clear use of structured frameworks (STAR, CIRCLES)",
    "Demonstrates ownership and initiative",
  ],
  improvements: [
    "Add quantifiable outcomes to answers — metrics matter",
    "Technical depth on data analysis tools needs work",
    "Pause filler words (um, like) — affects perceived confidence",
  ],
  studyPlan: [
    "Data analysis fundamentals (2-3 days)",
    "Metrics-driven storytelling (1 day)",
    "Mock technical questions for PM roles (ongoing)",
  ],
};

