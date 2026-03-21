import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Check, X, RotateCcw, Twitter, Facebook, Mail, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TriviaQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface TriviaQuiz {
  id: number;
  date: string;
  title: string;
  questions: string; // JSON string
  difficulty: "easy" | "medium" | "hard";
}

interface TriviaQuizGameProps {
  triviaQuiz: TriviaQuiz;
  onComplete?: (answers: number[], correctCount: number, timeSpent: number) => void;
}

export default function TriviaQuizGame({ triviaQuiz, onComplete }: TriviaQuizGameProps) {
  const questions: TriviaQuestion[] = JSON.parse(triviaQuiz.questions);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>(Array(questions.length).fill(-1));
  const [showExplanation, setShowExplanation] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const [correctCount, setCorrectCount] = useState(0);

  const handleAnswerSelect = (answerIndex: number) => {
    if (submitted) return;
    
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setShowExplanation(false);
    }
  };

  const handleSubmit = () => {
    const correct = userAnswers.filter((answer, idx) => 
      answer === questions[idx].correctAnswer
    ).length;
    setCorrectCount(correct);
    setSubmitted(true);
    setShowExplanation(true);

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    if (onComplete) {
      onComplete(userAnswers, correct, timeSpent);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setUserAnswers(Array(questions.length).fill(-1));
    setShowExplanation(false);
    setSubmitted(false);
    setCorrectCount(0);
  };

  const shareOnTwitter = () => {
    const score = `${correctCount}/${questions.length}`;
    const percentage = Math.round((correctCount / questions.length) * 100);
    const text = `I scored ${score} (${percentage}%) on today's Trivia Quiz! Can you beat my score?`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    // Note: X/Twitter doesn't support image parameter in intent URL, but will use og:image from page
    window.open(url, '_blank');
  };

  const shareOnFacebook = () => {
    const score = `${correctCount}/${questions.length}`;
    const percentage = Math.round((correctCount / questions.length) * 100);
    const text = `I scored ${score} (${percentage}%) on today's Trivia Quiz! Can you beat my score?`;
    let url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`;
    // Add site logo as image
    const logoUrl = `${window.location.origin}/logo.png`;
    url += `&picture=${encodeURIComponent(logoUrl)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    const score = `${correctCount}/${questions.length}`;
    const percentage = Math.round((correctCount / questions.length) * 100);
    const text = `I scored ${score} (${percentage}%) on today's Trivia Quiz! Can you beat my score?`;
    window.location.href = `mailto:?subject=Check out my Trivia Quiz score&body=${encodeURIComponent(text + '\n\n' + window.location.href)}`;
  };

  const question = questions[currentQuestion];
  const isAnswered = userAnswers[currentQuestion] !== -1;
  const isCorrect = userAnswers[currentQuestion] === question.correctAnswer;
  const allAnswered = userAnswers.every(a => a !== -1);

  if (submitted && currentQuestion === questions.length - 1 && !showExplanation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-3xl font-bold">
                  {correctCount}/{questions.length}
                </p>
                <p className="text-lg text-muted-foreground">
                  {Math.round((correctCount / questions.length) * 100)}% Correct
                </p>
                <p className="text-muted-foreground pt-2">
                  {correctCount === questions.length
                    ? "Perfect score! You're a trivia master! 🎉"
                    : correctCount >= questions.length * 0.7
                    ? "Great job! You really know your stuff! 👏"
                    : "Good effort! Try again tomorrow! 💪"}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <p className="text-sm text-green-900 dark:text-green-100 font-medium">
              🎉 Quiz completed! Share your results:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={shareOnTwitter}
                className="gap-2"
              >
                <Twitter className="w-4 h-4" />
                Share on X
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={shareOnFacebook}
                className="gap-2"
              >
                <Facebook className="w-4 h-4" />
                Share on Facebook
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={shareViaEmail}
                className="gap-2"
              >
                <Mail className="w-4 h-4" />
                Share via Email
              </Button>
            </div>
            <Button onClick={() => { setCurrentQuestion(0); setShowExplanation(true); }} variant="outline" className="w-full">
              Review Answers
            </Button>
          </div>

          <Button onClick={handleReset} variant="outline" className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{triviaQuiz.title}</CardTitle>
          <Badge variant="outline" className="capitalize">{triviaQuiz.difficulty}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          {submitted && <span className="font-medium">Score: {correctCount}/{questions.length}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium leading-relaxed">{question.question}</h3>

          <div className="space-y-2">
            {question.options.map((option, index) => {
              const isSelected = userAnswers[currentQuestion] === index;
              const isCorrectOption = index === question.correctAnswer;
              const showCorrect = submitted && isCorrectOption;
              const showIncorrect = submitted && isSelected && !isCorrectOption;

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={submitted}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all",
                    "hover:border-primary/50 hover:bg-accent/50",
                    isSelected && !submitted && "border-primary bg-accent",
                    showCorrect && "border-green-500 bg-green-50 dark:bg-green-950",
                    showIncorrect && "border-red-500 bg-red-50 dark:bg-red-950",
                    !isSelected && !showCorrect && "border-border",
                    submitted && "cursor-default"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex-1">{option}</span>
                    {showCorrect && <Check className="w-5 h-5 text-green-600 shrink-0" />}
                    {showIncorrect && <X className="w-5 h-5 text-red-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {submitted && showExplanation && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-2">
                  {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
                </p>
                <p className="text-sm text-muted-foreground">{question.explanation}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handlePrevious}
            variant="outline"
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          <div className="flex-1" />

          {!submitted && currentQuestion === questions.length - 1 && allAnswered ? (
            <Button onClick={handleSubmit} className="min-w-32">
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={currentQuestion === questions.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {!submitted && (
          <div className="flex gap-1 justify-center pt-2">
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "w-2 h-2 rounded-full",
                  userAnswers[idx] !== -1 ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
