import OpenAI from "openai";

interface Lesson {
  id: string;
  title: string;
  subject: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  content: string;
  objectives: string[];
  prerequisites: string[];
  duration: number;
  exercises: Exercise[];
  createdAt: number;
}

interface Exercise {
  id: string;
  type: "multiple_choice" | "fill_blank" | "coding" | "essay" | "practical";
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  hints: string[];
  points: number;
}

interface LearnerProfile {
  id: string;
  name: string;
  preferredLearningStyle: "visual" | "auditory" | "reading" | "kinesthetic";
  currentLevel: Record<string, "beginner" | "intermediate" | "advanced" | "expert">;
  completedLessons: string[];
  exerciseScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  adaptiveFactor: number;
}

interface LearningSession {
  id: string;
  learnerId: string;
  lessonId: string;
  startTime: number;
  endTime?: number;
  progress: number;
  exercisesCompleted: string[];
  score: number;
  feedback: string[];
}

interface AdaptiveFeedback {
  understanding: "poor" | "fair" | "good" | "excellent";
  pace: "too_slow" | "optimal" | "too_fast";
  suggestedAdjustments: string[];
  nextRecommendations: string[];
  encouragement: string;
}

interface KnowledgeNode {
  id: string;
  topic: string;
  connections: string[];
  mastery: number;
  lastAccessed: number;
}

class TeachingAdaptiveModule {
  private openai: OpenAI | null = null;
  private lessons: Map<string, Lesson> = new Map();
  private learners: Map<string, LearnerProfile> = new Map();
  private sessions: Map<string, LearningSession> = new Map();
  private knowledgeGraph: Map<string, KnowledgeNode> = new Map();
  private subjects: string[] = [];

  constructor() {
    console.log("[Teaching Module] Initializing adaptive learning system");
    this.initializeSubjects();
    this.initializeSampleLessons();
    console.log("[Teaching Module] Loaded curriculum and learning algorithms");
  }

  private getOpenAI(): OpenAI | null {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      if (apiKey) {
        this.openai = new OpenAI({ apiKey });
      }
    }
    return this.openai;
  }

  private initializeSubjects(): void {
    this.subjects = [
      "Biology", "Chemistry", "Physics", "Mathematics",
      "Computer Science", "Medicine", "Engineering",
      "Robotics", "AI/ML", "Data Science",
      "Biotechnology", "Genetics", "Neuroscience"
    ];
  }

  private initializeSampleLessons(): void {
    const lessons: Lesson[] = [
      {
        id: "bio_dna_101",
        title: "Introduction to DNA Structure",
        subject: "Biology",
        level: "beginner",
        content: "DNA (Deoxyribonucleic Acid) is the hereditary material in humans and almost all other organisms. It consists of two strands that wind around each other to form a double helix structure.",
        objectives: ["Understand the basic structure of DNA", "Identify the four nucleotide bases", "Explain base pairing rules"],
        prerequisites: [],
        duration: 30,
        exercises: [
          {
            id: "ex_dna_1",
            type: "multiple_choice",
            question: "What are the four nucleotide bases in DNA?",
            options: ["A, T, C, G", "A, U, C, G", "A, T, C, U", "G, T, U, C"],
            correctAnswer: "A, T, C, G",
            hints: ["Think of the complementary pairs"],
            points: 10
          }
        ],
        createdAt: Date.now()
      },
      {
        id: "med_venom_101",
        title: "Venom Detection and Treatment",
        subject: "Medicine",
        level: "intermediate",
        content: "Venoms are toxic secretions produced by various animals. Detection involves identifying specific toxins through biochemical markers. Treatment typically requires antivenom administration.",
        objectives: ["Classify types of venom", "Understand detection methods", "Learn emergency treatment protocols"],
        prerequisites: ["bio_dna_101"],
        duration: 45,
        exercises: [
          {
            id: "ex_venom_1",
            type: "multiple_choice",
            question: "Which type of venom primarily affects the nervous system?",
            options: ["Hemotoxin", "Cytotoxin", "Neurotoxin", "Myotoxin"],
            correctAnswer: "Neurotoxin",
            hints: ["Think about what 'neuro' means"],
            points: 10
          }
        ],
        createdAt: Date.now()
      },
      {
        id: "cs_ml_101",
        title: "Machine Learning Fundamentals",
        subject: "AI/ML",
        level: "intermediate",
        content: "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.",
        objectives: ["Understand ML paradigms", "Differentiate supervised and unsupervised learning", "Apply basic ML algorithms"],
        prerequisites: ["Mathematics basics", "Python programming"],
        duration: 60,
        exercises: [
          {
            id: "ex_ml_1",
            type: "coding",
            question: "Write a simple linear regression model using scikit-learn",
            hints: ["Import LinearRegression from sklearn.linear_model", "Use fit() and predict()"],
            points: 20
          }
        ],
        createdAt: Date.now()
      }
    ];

    lessons.forEach(l => this.lessons.set(l.id, l));
  }

  registerLearner(profile: Omit<LearnerProfile, "completedLessons" | "exerciseScores" | "strengths" | "weaknesses" | "adaptiveFactor">): LearnerProfile {
    const learner: LearnerProfile = {
      ...profile,
      completedLessons: [],
      exerciseScores: {},
      strengths: [],
      weaknesses: [],
      adaptiveFactor: 1.0
    };
    this.learners.set(learner.id, learner);
    return learner;
  }

  getLearner(learnerId: string): LearnerProfile | undefined {
    return this.learners.get(learnerId);
  }

  getLesson(lessonId: string): Lesson | undefined {
    return this.lessons.get(lessonId);
  }

  getAllLessons(subject?: string, level?: string): Lesson[] {
    let lessons = Array.from(this.lessons.values());
    if (subject) {
      lessons = lessons.filter(l => l.subject.toLowerCase() === subject.toLowerCase());
    }
    if (level) {
      lessons = lessons.filter(l => l.level === level);
    }
    return lessons;
  }

  async generateLesson(topic: string, level: Lesson["level"], subject: string): Promise<Lesson> {
    const openai = this.getOpenAI();
    let content = `Introduction to ${topic} at the ${level} level.`;
    let objectives: string[] = [`Understand ${topic}`, `Apply ${topic} concepts`];
    let exercises: Exercise[] = [];

    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "system",
            content: "You are an expert educator. Generate a structured lesson with content, objectives, and one exercise. Return JSON with keys: content (string), objectives (array), exercise (object with question, options, correctAnswer)."
          }, {
            role: "user",
            content: `Create a ${level} level lesson about "${topic}" in ${subject}.`
          }],
          max_tokens: 800
        });

        const text = response.choices[0].message.content || "";
        try {
          const parsed = JSON.parse(text);
          content = parsed.content || content;
          objectives = parsed.objectives || objectives;
          if (parsed.exercise) {
            exercises = [{
              id: `ex_${Date.now()}`,
              type: "multiple_choice",
              question: parsed.exercise.question,
              options: parsed.exercise.options,
              correctAnswer: parsed.exercise.correctAnswer,
              hints: ["Review the lesson content"],
              points: 10
            }];
          }
        } catch {
          content = text;
        }
      } catch (error) {
        console.error("[Teaching Module] Lesson generation error:", error);
      }
    }

    const lesson: Lesson = {
      id: `lesson_${Date.now()}`,
      title: topic,
      subject,
      level,
      content,
      objectives,
      prerequisites: [],
      duration: 30,
      exercises,
      createdAt: Date.now()
    };

    this.lessons.set(lesson.id, lesson);
    return lesson;
  }

  startSession(learnerId: string, lessonId: string): LearningSession {
    const session: LearningSession = {
      id: `session_${Date.now()}`,
      learnerId,
      lessonId,
      startTime: Date.now(),
      progress: 0,
      exercisesCompleted: [],
      score: 0,
      feedback: []
    };
    this.sessions.set(session.id, session);
    return session;
  }

  updateSessionProgress(sessionId: string, progress: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.progress = Math.min(100, progress);
      this.sessions.set(sessionId, session);
    }
  }

  submitExercise(sessionId: string, exerciseId: string, answer: string | string[]): {
    correct: boolean;
    score: number;
    feedback: string;
  } {
    const session = this.sessions.get(sessionId);
    const lesson = session ? this.lessons.get(session.lessonId) : null;
    const exercise = lesson?.exercises.find(e => e.id === exerciseId);

    if (!session || !exercise) {
      return { correct: false, score: 0, feedback: "Exercise not found" };
    }

    let correct = false;
    if (Array.isArray(exercise.correctAnswer)) {
      correct = Array.isArray(answer) && 
        exercise.correctAnswer.every(a => answer.includes(a)) &&
        answer.every(a => exercise.correctAnswer?.includes(a));
    } else {
      correct = answer === exercise.correctAnswer;
    }

    const score = correct ? exercise.points : 0;
    session.score += score;
    session.exercisesCompleted.push(exerciseId);
    session.feedback.push(correct ? "Correct!" : `Incorrect. The answer was: ${exercise.correctAnswer}`);
    this.sessions.set(sessionId, session);

    const learner = this.learners.get(session.learnerId);
    if (learner) {
      learner.exerciseScores[exerciseId] = score;
      this.learners.set(session.learnerId, learner);
    }

    return {
      correct,
      score,
      feedback: correct ? "Excellent work!" : `Not quite. Review the material and try again.`
    };
  }

  completeSession(sessionId: string): LearningSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.endTime = Date.now();
    session.progress = 100;
    this.sessions.set(sessionId, session);

    const learner = this.learners.get(session.learnerId);
    if (learner) {
      learner.completedLessons.push(session.lessonId);
      this.updateAdaptiveFactor(learner, session);
      this.learners.set(session.learnerId, learner);
    }

    return session;
  }

  private updateAdaptiveFactor(learner: LearnerProfile, session: LearningSession): void {
    const lesson = this.lessons.get(session.lessonId);
    if (!lesson) return;

    const maxScore = lesson.exercises.reduce((sum, e) => sum + e.points, 0);
    const percentage = maxScore > 0 ? session.score / maxScore : 0;

    if (percentage >= 0.9) {
      learner.adaptiveFactor = Math.min(2.0, learner.adaptiveFactor + 0.1);
    } else if (percentage < 0.6) {
      learner.adaptiveFactor = Math.max(0.5, learner.adaptiveFactor - 0.1);
    }
  }

  getAdaptiveFeedback(learnerId: string): AdaptiveFeedback {
    const learner = this.learners.get(learnerId);
    if (!learner) {
      return {
        understanding: "fair",
        pace: "optimal",
        suggestedAdjustments: ["Register as a learner first"],
        nextRecommendations: [],
        encouragement: "Welcome to the learning platform!"
      };
    }

    const scores = Object.values(learner.exerciseScores);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const understanding: AdaptiveFeedback["understanding"] = 
      avgScore >= 90 ? "excellent" :
      avgScore >= 70 ? "good" :
      avgScore >= 50 ? "fair" : "poor";

    const pace: AdaptiveFeedback["pace"] = 
      learner.adaptiveFactor > 1.3 ? "too_slow" :
      learner.adaptiveFactor < 0.7 ? "too_fast" : "optimal";

    const suggestedAdjustments: string[] = [];
    if (understanding === "poor") {
      suggestedAdjustments.push("Review prerequisite material");
      suggestedAdjustments.push("Try more practice exercises");
    }
    if (pace === "too_fast") {
      suggestedAdjustments.push("Take more time with each concept");
    }

    const nextRecommendations = this.getRecommendedLessons(learnerId).map(l => l.title);

    const encouragements = [
      "Keep up the great work!",
      "You're making excellent progress!",
      "Every step forward counts!",
      "Your dedication is inspiring!"
    ];

    return {
      understanding,
      pace,
      suggestedAdjustments,
      nextRecommendations,
      encouragement: encouragements[Math.floor(Math.random() * encouragements.length)]
    };
  }

  getRecommendedLessons(learnerId: string): Lesson[] {
    const learner = this.learners.get(learnerId);
    if (!learner) return [];

    const allLessons = Array.from(this.lessons.values());
    const available = allLessons.filter(lesson => {
      if (learner.completedLessons.includes(lesson.id)) return false;
      return lesson.prerequisites.every(prereq => 
        learner.completedLessons.includes(prereq)
      );
    });

    return available.slice(0, 5);
  }

  addKnowledgeNode(topic: string, connections: string[] = []): KnowledgeNode {
    const node: KnowledgeNode = {
      id: `node_${Date.now()}`,
      topic,
      connections,
      mastery: 0,
      lastAccessed: Date.now()
    };
    this.knowledgeGraph.set(node.id, node);
    return node;
  }

  updateMastery(nodeId: string, mastery: number): void {
    const node = this.knowledgeGraph.get(nodeId);
    if (node) {
      node.mastery = Math.min(100, Math.max(0, mastery));
      node.lastAccessed = Date.now();
      this.knowledgeGraph.set(nodeId, node);
    }
  }

  getKnowledgeGraph(): KnowledgeNode[] {
    return Array.from(this.knowledgeGraph.values());
  }

  async chat(learnerId: string, question: string): Promise<string> {
    const learner = this.learners.get(learnerId);
    const openai = this.getOpenAI();

    if (openai) {
      try {
        const context = learner ? 
          `The learner prefers ${learner.preferredLearningStyle} learning and is at ${JSON.stringify(learner.currentLevel)} levels.` :
          "This is a new learner.";

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "system",
            content: `You are CYRUS, an adaptive teaching AI. ${context} Explain concepts clearly and encourage learning. Adapt your explanations to the learner's level.`
          }, {
            role: "user",
            content: question
          }],
          max_tokens: 500
        });

        return response.choices[0].message.content || "I'm here to help you learn. Could you rephrase your question?";
      } catch (error) {
        console.error("[Teaching Module] Chat error:", error);
      }
    }

    return `That's a great question about "${question}". Let me help you understand this topic better. What specific aspect would you like to explore?`;
  }

  getStatus(): {
    operational: boolean;
    lessons: number;
    learners: number;
    subjects: number;
    sessions: number;
  } {
    return {
      operational: true,
      lessons: this.lessons.size,
      learners: this.learners.size,
      subjects: this.subjects.length,
      sessions: this.sessions.size
    };
  }
}

export const teachingModule = new TeachingAdaptiveModule();
