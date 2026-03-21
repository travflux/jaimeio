// Debug script to test article body parsing
const testBody = `{ "headline": "Nation's Dentists Declare Emergency: Manual Brushing Now Considered 'Extreme Sport,' Requires Waiver", "subheadline": "New study reveals millions are risking dental 'catastrophe' by neglecting AI-powered oral hygiene devices.", "body": "TOOTHVILLE, OH – A groundbreaking, 17-year study conducted by the National Institute of Enamel Integrity (N.I.E.I.) has officially reclassified manual toothbrushing as a 'Class 3 Extreme Oral Endeavor,' effective immediately. Citizens wishing to continue the ancient practice will now require a signed liability waiver and a minimum of 40 hours of supervised 'bristle-to-gum' training.\\n\\n\\"The data is unequivocal,\\" stated Dr. Cletus P. Flossington, Chief Oral Risk Assessor at the N.I.E.I., adjusting his magnifying loupes. \\"Our predictive algorithms indicate a 97.4% higher probability of 'sub-optimal plaque displacement' for individuals employing non-motorized bristle arrays. It's akin to trying to clean a skyscraper with a feather duster.\\"\\n\\nThe move comes on the heels of a Wired.com article titled 'Best Electric Toothbrush, Backed by Real-Life Testing (2026),' which reportedly highlighted the 'existential threat' posed by inadequate vibrational frequencies. Experts now warn that anything less than 40,000 brush strokes per minute could lead to a 'societal decay of gumline fortitude.'\\n\\n\\"We're not saying manual brushing is inherently evil,\\" clarified Brenda 'The Brush Whisperer' Sparkletooth, a certified Oral Device Deployment Specialist. \\"But it's simply not scalable for the modern mouth. The average human hand lacks the precision and sustained kinetic energy required to truly 'interface' with the oral microbiome. We're facing a crisis of collective dental apathy.\\" Local dental clinics are reportedly bracing for an influx of waiver applications, many of which are expected to be denied." }`;

const trimmed = testBody.trim();
console.log('Starts with {:', trimmed.startsWith('{'));
console.log('Ends with }:', trimmed.endsWith('}'));

try {
  const parsed = JSON.parse(trimmed);
  console.log('Parsed successfully');
  console.log('Has body field:', !!parsed.body);
  console.log('Body type:', typeof parsed.body);
  
  if (parsed.body && typeof parsed.body === 'string') {
    let extractedBody = parsed.body;
    console.log('Original body length:', extractedBody.length);
    console.log('First 100 chars:', extractedBody.substring(0, 100));
    
    // Replace escaped newlines
    extractedBody = extractedBody.replace(/\\n/g, '\n');
    console.log('After newline replacement:', extractedBody.substring(0, 100));
    
    // Split into paragraphs
    const paragraphs = extractedBody.split('\n\n').filter((p: string) => p.trim());
    console.log('Number of paragraphs:', paragraphs.length);
    console.log('First paragraph:', paragraphs[0]);
  }
} catch (e) {
  console.error('Parse error:', e);
}
