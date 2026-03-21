import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Check, X, RotateCcw, Twitter, Facebook, Mail } from "lucide-react";

interface ScrambledWord {
  word: string;
  scrambled: string;
  hint: string;
  category: string;
}

interface WordScramble {
  id: number;
  date: string;
  title: string;
  words: string; // JSON string
  difficulty: "easy" | "medium" | "hard";
}

interface WordScrambleGameProps {
  wordScramble: WordScramble;
  onComplete?: (answers: string[], correctCount: number, timeSpent: number) => void;
}

export default function WordScrambleGame({ wordScramble, onComplete }: WordScrambleGameProps) {
  const words: ScrambledWord[] = JSON.parse(wordScramble.words);
  const [userAnswers, setUserAnswers] = useState<string[]>(Array(words.length).fill(""));
  const [revealed, setRevealed] = useState<boolean[]>(Array(words.length).fill(false));
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const [correctCount, setCorrectCount] = useState(0);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value.toUpperCase();
    setUserAnswers(newAnswers);
  };

  const handleReveal = (index: number) => {
    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);
  };

  const handleSubmit = () => {
    const correct = userAnswers.filter((answer, idx) => 
      answer.toUpperCase() === words[idx].word.toUpperCase()
    ).length;
    setCorrectCount(correct);
    setSubmitted(true);

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    if (onComplete) {
      onComplete(userAnswers, correct, timeSpent);
    }
  };

  const handleReset = () => {
    setUserAnswers(Array(words.length).fill(""));
    setRevealed(Array(words.length).fill(false));
    setSubmitted(false);
    setCorrectCount(0);
  };

  const shareOnTwitter = () => {
    const score = `${correctCount}/${words.length}`;
    const text = `I scored ${score} on today's Word Scramble! Can you beat my score?`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
  };

  const shareOnFacebook = () => {
    const score = `${correctCount}/${words.length}`;
    const text = `I scored ${score} on today's Word Scramble! Can you beat my score?`;
    let url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`;
    // Add site logo as image
    const logoUrl = `${window.location.origin}/logo.png`;
    url += `&picture=${encodeURIComponent(logoUrl)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    const score = `${correctCount}/${words.length}`;
    const text = `I scored ${score} on today's Word Scramble! Can you beat my score?`;
    window.location.href = `mailto:?subject=Check out my Word Scramble score&body=${encodeURIComponent(text + '\n\n' + window.location.href)}`;
  };

  const isCorrect = (index: number) => {
    return userAnswers[index].toUpperCase() === words[index].word.toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{wordScramble.title}</CardTitle>
          <Badge variant="outline" className="capitalize">{wordScramble.difficulty}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Unscramble the words using the hints provided
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {words.map((word, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{word.category}</Badge>
                  <span className="text-lg font-mono font-bold tracking-wider text-primary">
                    {word.scrambled}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  Hint: {word.hint}
                </p>
              </div>
              {!submitted && !revealed[index] && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReveal(index)}
                  className="shrink-0"
                >
                  Reveal
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={revealed[index] ? word.word : userAnswers[index]}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Your answer..."
                disabled={submitted || revealed[index]}
                className={`uppercase font-mono ${
                  submitted
                    ? isCorrect(index)
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "border-red-500 bg-red-50 dark:bg-red-950"
                    : revealed[index]
                    ? "bg-muted"
                    : ""
                }`}
              />
              {submitted && (
                <div className="shrink-0">
                  {isCorrect(index) ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                </div>
              )}
            </div>

            {submitted && !isCorrect(index) && !revealed[index] && (
              <p className="text-sm text-muted-foreground">
                Correct answer: <span className="font-mono font-bold">{word.word}</span>
              </p>
            )}
          </div>
        ))}

        {!submitted ? (
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmit} className="flex-1">
              Submit Answers
            </Button>
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-2xl font-bold">
                    Score: {correctCount}/{words.length}
                  </p>
                  <p className="text-muted-foreground">
                    {correctCount === words.length
                      ? "Perfect! You're a word master! 🎉"
                      : correctCount >= words.length * 0.7
                      ? "Great job! Keep it up! 👏"
                      : "Good effort! Try again tomorrow! 💪"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <p className="text-sm text-green-900 dark:text-green-100 font-medium">
                🎉 Challenge completed! Share your results:
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
              <Button onClick={handleReset} variant="outline" className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
