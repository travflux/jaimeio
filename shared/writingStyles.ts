/**
 * Writing styles organized by category with randomization support
 * Each category contains multiple styles, allowing users to pick specific styles or randomize
 */

export interface WritingStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
}

export interface WritingStyleCategory {
  id: string;
  name: string;
  description: string;
  styles: WritingStyle[];
}

export const WRITING_STYLES: WritingStyle[] = [
  // ─── SATIRICAL CATEGORY ───────────────────────────────────────
  {
    id: "onion",
    name: "The Onion (Classic Absurdist)",
    description: "Deadpan, absurd headlines with matter-of-fact reporting",
    category: "satirical",
    prompt: "Write in the style of The Onion — absurd, deadpan, and hilarious. Use matter-of-fact reporting tone for completely ridiculous scenarios. Headlines should be shocking yet delivered with journalistic seriousness."
  },
  {
    id: "babylon_bee",
    name: "Babylon Bee (Cultural Commentary)",
    description: "Sharp cultural and political satire with exaggerated headlines",
    category: "satirical",
    prompt: "Write in the style of The Babylon Bee — sharp cultural and political satire with exaggerated but plausible-sounding headlines. Focus on current events and social trends with witty commentary."
  },
  {
    id: "daily_mash",
    name: "Daily Mash (British Cynicism)",
    description: "Cynical, irreverent British humor with biting social commentary",
    category: "satirical",
    prompt: "Write in the style of The Daily Mash — cynical, irreverent British humor with biting social commentary. Use dry wit, sarcasm, and a pessimistic view of current events. Embrace British colloquialisms and dark humor."
  },
  {
    id: "hard_times",
    name: "Hard Times (Punk/Counterculture)",
    description: "Punk rock and counterculture satire with edgy, rebellious tone",
    category: "satirical",
    prompt: "Write in the style of The Hard Times — punk rock and counterculture satire with an edgy, rebellious tone. Focus on music scene, DIY culture, and anti-establishment themes with irreverent humor."
  },
  {
    id: "clickhole",
    name: "ClickHole (Meta/Absurdist)",
    description: "Meta-commentary on clickbait culture with surreal, experimental humor",
    category: "satirical",
    prompt: "Write in the style of ClickHole — meta-commentary on clickbait and internet culture with surreal, experimental humor. Embrace absurdity, non-sequiturs, and parody of viral content formats."
  },
  {
    id: "reductress",
    name: "Reductress (Women's Magazine Parody)",
    description: "Parody of women's lifestyle magazines with feminist satire",
    category: "satirical",
    prompt: "Write in the style of Reductress — parody of women's lifestyle magazines with sharp feminist satire. Mock beauty standards, relationship advice, and wellness culture with self-aware humor."
  },
  {
    id: "duffel_blog",
    name: "Duffel Blog (Military Satire)",
    description: "Military satire with insider humor and absurd military scenarios",
    category: "satirical",
    prompt: "Write in the style of Duffel Blog — military satire with insider humor and absurd military scenarios. Use military jargon and culture references with irreverent commentary on military life."
  },
  {
    id: "waterford",
    name: "Waterford Whispers (Irish Satire)",
    description: "Irish satire with local humor and cultural references",
    category: "satirical",
    prompt: "Write in the style of Waterford Whispers News — Irish satire with local humor and cultural references. Use Irish colloquialisms and mock Irish news with witty social commentary."
  },
  {
    id: "shovel",
    name: "The Shovel (Australian Satire)",
    description: "Australian satire with irreverent local humor",
    category: "satirical",
    prompt: "Write in the style of The Shovel — Australian satire with irreverent local humor. Use Australian slang and mock Australian news with cynical commentary on local politics and culture."
  },
  {
    id: "beaverton",
    name: "The Beaverton (Canadian Satire)",
    description: "Canadian satire with polite yet biting humor",
    category: "satirical",
    prompt: "Write in the style of The Beaverton — Canadian satire with polite yet biting humor. Mock Canadian politics and culture with witty commentary while maintaining a friendly tone."
  },

  // ─── BUSINESS PROFESSIONAL CATEGORY ───────────────────────────
  {
    id: "corporate_formal",
    name: "Corporate Formal",
    description: "Formal business language with professional tone and corporate jargon",
    category: "business_professional",
    prompt: "Write in a formal corporate style. Use professional business language, industry jargon, and corporate terminology. Maintain a serious, authoritative tone suitable for executive communications and formal reports."
  },
  {
    id: "business_news",
    name: "Business News",
    description: "Professional business reporting with financial focus",
    category: "business_professional",
    prompt: "Write in the style of business news outlets like Bloomberg or Reuters. Use professional reporting tone, include financial metrics and market analysis. Focus on business impact and corporate developments."
  },
  {
    id: "thought_leadership",
    name: "Thought Leadership",
    description: "Expert insights with authoritative, educational tone",
    category: "business_professional",
    prompt: "Write in a thought leadership style. Position the subject as an industry insight or expert perspective. Use authoritative but accessible language to educate readers about business trends and best practices."
  },
  {
    id: "white_paper",
    name: "White Paper",
    description: "Technical, detailed analysis with research-backed insights",
    category: "business_professional",
    prompt: "Write in white paper style. Provide detailed, technical analysis with research-backed insights. Use formal language and structured arguments suitable for in-depth business documentation."
  },
  {
    id: "press_release",
    name: "Press Release",
    description: "Formal announcement style with key facts and quotes",
    category: "business_professional",
    prompt: "Write in press release style. Lead with the most important information, include key facts and potential quotes. Use formal, newsworthy language suitable for media distribution."
  },

  // ─── SALES & MARKETING CATEGORY ──────────────────────────────
  {
    id: "sales_pitch",
    name: "Sales Pitch",
    description: "Persuasive, benefit-focused language highlighting value proposition",
    category: "sales_marketing",
    prompt: "Write in a sales pitch style. Focus on benefits, value proposition, and persuasive language. Use compelling calls-to-action and highlight customer pain points and solutions."
  },
  {
    id: "marketing_hype",
    name: "Marketing Hype",
    description: "Enthusiastic, benefit-driven marketing language",
    category: "sales_marketing",
    prompt: "Write in marketing hype style. Use enthusiastic, benefit-driven language to promote products or ideas. Include compelling benefits, emotional appeals, and strong calls-to-action."
  },
  {
    id: "copywriting",
    name: "Copywriting",
    description: "Persuasive, conversion-focused writing for ads and promotions",
    category: "sales_marketing",
    prompt: "Write in professional copywriting style. Create persuasive, conversion-focused copy suitable for advertisements and promotions. Use proven copywriting techniques like scarcity, urgency, and social proof."
  },
  {
    id: "email_marketing",
    name: "Email Marketing",
    description: "Engaging email copy with clear value and call-to-action",
    category: "sales_marketing",
    prompt: "Write in email marketing style. Create engaging email copy with a clear value proposition and strong call-to-action. Use personalization and benefit-focused language to drive engagement."
  },
  {
    id: "social_media_marketing",
    name: "Social Media Marketing",
    description: "Casual, engaging social media content with hashtags and emojis",
    category: "sales_marketing",
    prompt: "Write in social media marketing style. Use casual, engaging language suitable for social platforms. Include trending language, relevant hashtags, and engaging hooks to drive shares and engagement."
  },

  // ─── ENTHUSIASTIC & INSPIRATIONAL CATEGORY ────────────────────
  {
    id: "enthusiastic",
    name: "Enthusiastic",
    description: "Upbeat, positive tone with exclamation marks and energetic language",
    category: "enthusiastic",
    prompt: "Write in an enthusiastic, upbeat style. Use positive language, exclamation marks, and energetic tone. Express genuine excitement and passion about the subject matter."
  },
  {
    id: "motivational",
    name: "Motivational",
    description: "Inspiring language focused on personal growth and achievement",
    category: "enthusiastic",
    prompt: "Write in a motivational style. Focus on inspiration, personal growth, and achievement. Use empowering language that encourages readers to take action and believe in themselves."
  },
  {
    id: "wellness",
    name: "Wellness & Lifestyle",
    description: "Health-focused, positive tone emphasizing well-being",
    category: "enthusiastic",
    prompt: "Write in wellness and lifestyle style. Focus on health, well-being, and positive living. Use encouraging language that promotes self-care, balance, and personal wellness."
  },
  {
    id: "adventure",
    name: "Adventure & Travel",
    description: "Exciting, exploratory tone that inspires wanderlust",
    category: "enthusiastic",
    prompt: "Write in adventure and travel style. Use exciting, exploratory language that inspires wanderlust and curiosity. Focus on experiences, discoveries, and the thrill of exploration."
  },

  // ─── EDUCATIONAL & INFORMATIVE CATEGORY ──────────────────────
  {
    id: "educational",
    name: "Educational",
    description: "Clear, instructional tone focused on teaching and explaining",
    category: "educational",
    prompt: "Write in an educational style. Focus on teaching and explaining concepts clearly. Use structured language, definitions, and examples to help readers understand the subject matter."
  },
  {
    id: "how_to",
    name: "How-To Guide",
    description: "Step-by-step instructional style with clear procedures",
    category: "educational",
    prompt: "Write in a how-to guide style. Use clear, step-by-step instructions with actionable advice. Include tips, warnings, and practical examples to help readers accomplish their goals."
  },
  {
    id: "research_analysis",
    name: "Research & Analysis",
    description: "Data-driven, analytical tone with evidence-based insights",
    category: "educational",
    prompt: "Write in research and analysis style. Use data-driven, analytical language with evidence-based insights. Include statistics, research findings, and logical analysis to support conclusions."
  },
  {
    id: "explainer",
    name: "Explainer",
    description: "Accessible, conversational explanation of complex topics",
    category: "educational",
    prompt: "Write in an explainer style. Break down complex topics into accessible, conversational explanations. Use analogies and simple language to make difficult concepts understandable."
  },

  // ─── CONVERSATIONAL & CASUAL CATEGORY ─────────────────────────
  {
    id: "conversational",
    name: "Conversational",
    description: "Friendly, casual tone like talking to a friend",
    category: "conversational",
    prompt: "Write in a conversational style. Use friendly, casual language like you're talking to a friend. Include contractions, informal phrases, and a warm, approachable tone."
  },
  {
    id: "storytelling",
    name: "Storytelling",
    description: "Narrative-driven with engaging story elements",
    category: "conversational",
    prompt: "Write in a storytelling style. Use narrative elements, vivid descriptions, and engaging story arcs. Draw readers in with compelling narratives and relatable characters."
  },
  {
    id: "blog",
    name: "Blog",
    description: "Personal, authentic voice with casual expertise",
    category: "conversational",
    prompt: "Write in a blog style. Use a personal, authentic voice with casual expertise. Share insights and experiences in an engaging, relatable way suitable for blog content."
  },
  {
    id: "podcast_transcript",
    name: "Podcast Transcript",
    description: "Conversational, spoken-word style with natural dialogue",
    category: "conversational",
    prompt: "Write in a podcast transcript style. Use conversational, spoken-word language with natural dialogue and informal phrasing. Include pauses and natural speech patterns."
  },

  // ─── CREATIVE & ARTISTIC CATEGORY ────────────────────────────
  {
    id: "poetic",
    name: "Poetic",
    description: "Lyrical, artistic language with metaphors and imagery",
    category: "creative",
    prompt: "Write in a poetic style. Use lyrical, artistic language with metaphors, imagery, and emotional depth. Create beautiful, evocative prose that appeals to the senses."
  },
  {
    id: "dramatic",
    name: "Dramatic",
    description: "Theatrical, intense language with emotional impact",
    category: "creative",
    prompt: "Write in a dramatic style. Use theatrical, intense language with emotional impact. Create compelling narratives with high stakes and vivid descriptions."
  },
  {
    id: "humorous",
    name: "Humorous",
    description: "Witty, funny tone with clever wordplay and jokes",
    category: "creative",
    prompt: "Write in a humorous style. Use witty, funny language with clever wordplay and jokes. Make readers laugh while delivering your message with comedic timing and unexpected twists."
  },
  {
    id: "noir",
    name: "Noir/Detective",
    description: "Dark, mysterious tone with noir detective style",
    category: "creative",
    prompt: "Write in a noir/detective style. Use dark, mysterious language with cynical observations. Create a moody atmosphere with hard-boiled detective narrative elements."
  },
];

export const WRITING_STYLE_CATEGORIES: WritingStyleCategory[] = [
  {
    id: "satirical",
    name: "Satirical",
    description: "Humorous, absurdist, and satirical writing styles",
    styles: WRITING_STYLES.filter(s => s.category === "satirical")
  },
  {
    id: "business_professional",
    name: "Business Professional",
    description: "Formal, corporate, and professional business writing",
    styles: WRITING_STYLES.filter(s => s.category === "business_professional")
  },
  {
    id: "sales_marketing",
    name: "Sales & Marketing",
    description: "Persuasive and promotional writing styles",
    styles: WRITING_STYLES.filter(s => s.category === "sales_marketing")
  },
  {
    id: "enthusiastic",
    name: "Enthusiastic & Inspirational",
    description: "Upbeat, positive, and motivational writing",
    styles: WRITING_STYLES.filter(s => s.category === "enthusiastic")
  },
  {
    id: "educational",
    name: "Educational & Informative",
    description: "Teaching-focused and analytical writing styles",
    styles: WRITING_STYLES.filter(s => s.category === "educational")
  },
  {
    id: "conversational",
    name: "Conversational & Casual",
    description: "Friendly, casual, and personal writing styles",
    styles: WRITING_STYLES.filter(s => s.category === "conversational")
  },
  {
    id: "creative",
    name: "Creative & Artistic",
    description: "Artistic, poetic, and creative writing styles",
    styles: WRITING_STYLES.filter(s => s.category === "creative")
  },
];

/**
 * Get a random style from a specific category
 */
export function getRandomStyleFromCategory(categoryId: string): WritingStyle | null {
  const category = WRITING_STYLE_CATEGORIES.find(c => c.id === categoryId);
  if (!category || category.styles.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * category.styles.length);
  return category.styles[randomIndex];
}

/**
 * Get a random style from all styles
 */
export function getRandomStyle(): WritingStyle {
  const randomIndex = Math.floor(Math.random() * WRITING_STYLES.length);
  return WRITING_STYLES[randomIndex];
}


/**
 * Get style prompt by ID, handling random selections
 */
export function getStylePrompt(styleId: string): string {
  // Handle random category selection
  if (styleId.startsWith("random-")) {
    const categoryId = styleId.replace("random-", "");
    const style = getRandomStyleFromCategory(categoryId);
    return style?.prompt || "Write in a creative, engaging style.";
  }
  
  // Find specific style
  const style = WRITING_STYLES.find(s => s.id === styleId);
  return style?.prompt || "Write in a creative, engaging style.";
}
