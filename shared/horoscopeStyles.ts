/**
 * Horoscope Writing Styles
 * 
 * Separate style system for horoscope content with appropriate tones
 * for astrological readings and daily guidance.
 */

export interface HoroscopeStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export interface HoroscopeCategory {
  id: string;
  name: string;
  description: string;
  styles: HoroscopeStyle[];
}

export const horoscopeCategories: HoroscopeCategory[] = [
  {
    id: "mystical",
    name: "Mystical & Spiritual",
    description: "Deep, spiritual guidance with cosmic wisdom",
    styles: [
      {
        id: "cosmic-mystic",
        name: "Cosmic Mystic",
        description: "Ethereal and mystical with cosmic connections",
        prompt: "Write in a deeply mystical and spiritual tone. Reference cosmic energies, celestial alignments, and universal forces. Use poetic, flowing language that evokes wonder and spiritual depth. Speak of energies, vibrations, and the interconnectedness of all things."
      },
      {
        id: "ancient-wisdom",
        name: "Ancient Wisdom",
        description: "Timeless wisdom from ancient traditions",
        prompt: "Channel the voice of ancient astrological traditions. Reference classical elements, planetary dignities, and time-honored wisdom. Use formal, reverent language that honors millennia of astrological knowledge. Speak with authority and depth."
      },
      {
        id: "intuitive-guide",
        name: "Intuitive Guide",
        description: "Gentle, intuitive spiritual guidance",
        prompt: "Write as a compassionate intuitive guide. Focus on inner wisdom, emotional insights, and spiritual growth. Use warm, nurturing language that encourages self-reflection and trust in one's intuition. Emphasize personal empowerment and inner knowing."
      },
      {
        id: "tarot-fusion",
        name: "Tarot Fusion",
        description: "Blends astrology with tarot symbolism",
        prompt: "Weave together astrological and tarot imagery. Reference archetypal energies, symbolic journeys, and transformative themes. Use rich, symbolic language that speaks to the subconscious. Draw connections between planetary movements and tarot wisdom."
      }
    ]
  },
  {
    id: "traditional",
    name: "Traditional & Classic",
    description: "Time-tested astrological guidance",
    styles: [
      {
        id: "newspaper-classic",
        name: "Newspaper Classic",
        description: "Traditional newspaper horoscope style",
        prompt: "Write in the classic newspaper horoscope style. Be concise, practical, and accessible. Focus on daily events, relationships, work, and finances. Use straightforward language that anyone can understand. Keep predictions specific but not overly dramatic."
      },
      {
        id: "professional-astrologer",
        name: "Professional Astrologer",
        description: "Authoritative and knowledgeable",
        prompt: "Write as a professional astrologer with years of experience. Use proper astrological terminology while remaining accessible. Reference planetary aspects, transits, and houses with confidence. Balance technical knowledge with practical application."
      },
      {
        id: "almanac-style",
        name: "Almanac Style",
        description: "Practical wisdom like a farmer's almanac",
        prompt: "Write in the practical, down-to-earth style of a farmer's almanac. Focus on timing, seasons, and practical matters. Use simple, direct language with an emphasis on actionable advice. Connect celestial movements to everyday life and decision-making."
      }
    ]
  },
  {
    id: "modern",
    name: "Modern & Contemporary",
    description: "Fresh, relatable astrological insights",
    styles: [
      {
        id: "millennial-astro",
        name: "Millennial Astro",
        description: "Relatable and contemporary",
        prompt: "Write for a modern, millennial audience. Use contemporary language and references. Focus on self-care, mental health, relationships, and career growth. Be encouraging and empowering. Acknowledge modern challenges like work-life balance and social media."
      },
      {
        id: "wellness-focused",
        name: "Wellness Focused",
        description: "Holistic health and self-care emphasis",
        prompt: "Center the horoscope around wellness, self-care, and holistic health. Reference mindfulness, meditation, nutrition, and emotional well-being. Use gentle, supportive language that encourages healthy habits and self-compassion. Connect planetary energies to mind-body-spirit balance."
      },
      {
        id: "manifestation-coach",
        name: "Manifestation Coach",
        description: "Law of attraction and manifestation focus",
        prompt: "Write as a manifestation coach using astrological timing. Focus on setting intentions, attracting abundance, and co-creating with the universe. Use empowering, motivational language. Emphasize personal power, positive thinking, and aligned action."
      },
      {
        id: "tech-savvy",
        name: "Tech-Savvy Astro",
        description: "Modern with tech and digital life references",
        prompt: "Blend astrology with modern technology and digital life. Reference apps, social media, remote work, and digital communication. Use contemporary slang and references. Make astrology feel relevant to the always-connected generation."
      }
    ]
  },
  {
    id: "playful",
    name: "Playful & Fun",
    description: "Light-hearted and entertaining",
    styles: [
      {
        id: "witty-friend",
        name: "Witty Friend",
        description: "Like advice from a clever friend",
        prompt: "Write as a witty, clever friend giving astrological advice. Use humor, pop culture references, and relatable scenarios. Be playful but still insightful. Make astrology fun and accessible without being condescending. Include the occasional joke or clever observation."
      },
      {
        id: "cosmic-comedy",
        name: "Cosmic Comedy",
        description: "Humorous with a cosmic twist",
        prompt: "Inject humor into astrological guidance. Use playful language, cosmic puns, and light-hearted observations. Don't take things too seriously while still providing genuine insights. Make readers smile while they read their horoscope."
      },
      {
        id: "emoji-astro",
        name: "Emoji Astro",
        description: "Fun and expressive with emoji energy",
        prompt: "Write in an energetic, expressive style (but don't actually use emojis in the text). Use exclamation points, vivid descriptions, and enthusiastic language. Make horoscopes feel like an exciting text from a friend. Be upbeat and positive."
      }
    ]
  },
  {
    id: "poetic",
    name: "Poetic & Artistic",
    description: "Beautiful, lyrical astrological prose",
    styles: [
      {
        id: "lyrical-poet",
        name: "Lyrical Poet",
        description: "Flowing, poetic language",
        prompt: "Write horoscopes as poetry in prose form. Use metaphor, imagery, and lyrical language. Create beautiful, flowing sentences that evoke emotion and wonder. Paint pictures with words while delivering astrological insights."
      },
      {
        id: "mythological",
        name: "Mythological",
        description: "References myths and archetypal stories",
        prompt: "Weave mythological references and archetypal stories into horoscopes. Reference Greek, Roman, and other mythologies associated with planets and signs. Use storytelling and narrative elements. Make readers feel part of an eternal cosmic story."
      },
      {
        id: "nature-inspired",
        name: "Nature Inspired",
        description: "Connects astrology to natural cycles",
        prompt: "Connect astrological movements to natural cycles and seasons. Use nature metaphors, references to plants, animals, and weather. Ground cosmic wisdom in the natural world. Help readers see themselves as part of nature's rhythms."
      }
    ]
  },
  {
    id: "direct",
    name: "Direct & Practical",
    description: "No-nonsense, actionable guidance",
    styles: [
      {
        id: "straight-shooter",
        name: "Straight Shooter",
        description: "Direct, honest, no fluff",
        prompt: "Be direct and to the point. No flowery language or vague predictions. Give clear, actionable advice. Tell it like it is while remaining supportive. Focus on what readers can actually do with this information."
      },
      {
        id: "life-coach",
        name: "Life Coach",
        description: "Motivational and action-oriented",
        prompt: "Write as a life coach using astrological timing. Focus on goals, action steps, and personal development. Use motivational language and concrete suggestions. Help readers take charge of their day with cosmic support."
      },
      {
        id: "business-astro",
        name: "Business Astro",
        description: "Career and professional focus",
        prompt: "Focus on career, business, and professional matters. Use business language and focus on productivity, networking, and career advancement. Connect planetary movements to professional opportunities and challenges."
      }
    ]
  }
];

// Helper function to get all horoscope styles as a flat array
export function getAllHoroscopeStyles(): HoroscopeStyle[] {
  return horoscopeCategories.flatMap(cat => cat.styles);
}

// Helper function to get a specific horoscope style by ID
export function getHoroscopeStyle(styleId: string): HoroscopeStyle | null {
  for (const category of horoscopeCategories) {
    const style = category.styles.find(s => s.id === styleId);
    if (style) return style;
  }
  return null;
}

// Helper function to get horoscope style prompt
export function getHoroscopeStylePrompt(styleId: string): string {
  // Handle random selection within a category
  if (styleId.startsWith("random-")) {
    const categoryId = styleId.replace("random-", "");
    const category = horoscopeCategories.find(c => c.id === categoryId);
    if (category && category.styles.length > 0) {
      const randomStyle = category.styles[Math.floor(Math.random() * category.styles.length)];
      return randomStyle.prompt;
    }
  }

  const style = getHoroscopeStyle(styleId);
  return style?.prompt || horoscopeCategories[0].styles[0].prompt; // Default to first style
}

// Helper function to get category by ID
export function getHoroscopeCategory(categoryId: string): HoroscopeCategory | null {
  return horoscopeCategories.find(c => c.id === categoryId) || null;
}
