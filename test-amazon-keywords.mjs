import { generateAmazonKeywords, getFallbackKeywords } from './server/amazonKeywords.ts';

// Test with different article types
const testArticles = [
  {
    title: "Best Electric Toothbrush, Backed by Real-Life Testing (2026)",
    content: "Nation's Dentists Declare Emergency: Manual Brushing Now Considered 'Extreme Sport,' Requires Waiver. New study reveals millions are risking dental 'catastrophe' by neglecting AI-powered oral hygiene devices. TOOTHVILLE, OH – A groundbreaking, 17-year study conducted by the National Institute of Enamel Integrity (N.I.E.I.) has officially reclassified manual toothbrushing as a 'Class 3 Extreme Oral Endeavor,' effective immediately.",
    category: "Opinion"
  },
  {
    title: "TrumpRx Unveils 'Art of the Deal' Dr. Oz-Branded Prescription Bottles",
    content: "New pharmaceutical initiative promises 'the best pills, believe me' with gold-plated caps and signature branding. Officials confirm all medications will be 'tremendous' and 'the greatest ever.'",
    category: "Business"
  },
  {
    title: "New AI-Powered Fitness Tracker Judges Your Life Choices",
    content: "Silicon Valley startup launches wearable device that monitors workouts, sleep patterns, and provides unsolicited life advice. Early adopters report feeling 'personally attacked' by their smartwatch.",
    category: "Tech"
  }
];

console.log("Testing Amazon Keyword Generation:\n");

testArticles.forEach((article, index) => {
  console.log(`\n${index + 1}. Article: "${article.title}"`);
  console.log(`   Category: ${article.category}`);
  const keywords = generateAmazonKeywords(article);
  console.log(`   Keywords: ${keywords}`);
});

console.log(`\n\nFallback Keywords: ${getFallbackKeywords()}`);
