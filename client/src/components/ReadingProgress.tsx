import { useReadingProgress } from "@/hooks/useScrollAnimation";

export default function ReadingProgress() {
  const progressRef = useReadingProgress();

  return <div ref={progressRef} className="reading-progress" style={{ width: "0%" }} />;
}
