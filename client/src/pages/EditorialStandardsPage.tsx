import Navbar from "@/components/Navbar";
import { useBranding } from "@/hooks/useBranding";
import Footer from "@/components/Footer";
import { BookOpen, AlertCircle, CheckCircle, Users, Shield, Eye } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";

const EditorialStandardsPage = () => {
  const { branding } = useBranding();
  const siteName = branding.siteName || "";
  usePageSEO({
    title: `Editorial Standards — ${siteName} | Our Principles`,
    description: `${siteName}'s editorial standards, principles, and corrections policy. We punch up, label clearly, and never fabricate to deceive — only to illuminate.`,
    keywords: "editorial standards, corrections policy, editorial principles, responsible satire, press ethics",
    defaultTitle: siteName,
  });
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-16">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Editorial Standards</h1>
            <p className="text-lg text-gray-300">
              Our commitment to responsible satire, editorial integrity, and transparency.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Last updated: February 18, 2026
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-16">
            
            {/* Mission Statement */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold">Our Mission</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {branding.siteName} exists to hold power accountable through the lens of {branding.genre}. We believe that humor, when wielded with precision and purpose, can illuminate truths that conventional journalism sometimes obscures. Our writers craft fictional scenarios inspired by real events to spark critical thinking, provoke conversation, and challenge the status quo.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mt-4">
                While our content is satirical and fictional, our standards are not. We are committed to editorial integrity, transparency, and accountability in everything we publish.
              </p>
            </section>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Editorial Principles */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold">Editorial Principles</h2>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Satire, Not Deception
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Every article on {branding.siteName} is clearly labeled as {branding.genre}. We never intend to deceive readers into believing our content is factual news. Our headlines, while provocative, are designed to be absurd enough to signal their satirical nature. We include disclaimers in our footer, About page, and Terms of Service to ensure transparency.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Punching Up, Not Down
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We direct our satire at institutions, public figures, and those in positions of power — not at vulnerable individuals or marginalized communities. Our goal is to critique power structures, not to ridicule the powerless. We avoid humor that relies on stereotypes, bigotry, or cruelty.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Accuracy in Inspiration
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    While our stories are fictional, they are inspired by real-world events, trends, and public statements. Our editorial team reviews news sources, public records, and credible reporting to ensure our satire is grounded in reality. We do not fabricate quotes or events out of thin air — we exaggerate, parody, and reimagine what already exists.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Editorial Independence</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {branding.siteName} maintains editorial independence from advertisers, sponsors, and external influences. Our writers and editors are free to critique any subject, regardless of commercial considerations. Advertisements on our site are clearly labeled and do not influence our editorial content.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Respect for Privacy</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We do not publish private information about individuals, including addresses, phone numbers, or personal details that could lead to harassment or harm. Our satire focuses on public actions, statements, and policies — not on private lives. We respect the distinction between public figures and private citizens.
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Corrections Policy */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold">Corrections Policy</h2>
              </div>

              <div className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  While our content is satirical and fictional, we strive for accuracy in the real-world events and facts that inspire our satire. If we make a factual error in our satirical premise (for example, misidentifying a public figure, misrepresenting a policy, or citing an incorrect date), we will correct it promptly and transparently.
                </p>

                <div>
                  <h3 className="text-xl font-semibold mb-3">How We Handle Corrections</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li><strong>Minor Corrections:</strong> Typos, spelling errors, and minor factual inaccuracies are corrected silently without a formal notice.</li>
                    <li><strong>Significant Corrections:</strong> If an error materially affects the premise or understanding of a satirical article, we will append a correction notice at the top or bottom of the article, clearly labeled with the date and nature of the correction.</li>
                    <li><strong>Retractions:</strong> In rare cases where an article is found to be fundamentally flawed or harmful, we may retract it entirely. Retracted articles will be replaced with a notice explaining the reason for removal.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">How to Report an Error</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    If you believe we have made a factual error in our satirical premise or misrepresented a real-world event, please contact us at <a href="mailto:corrections@example.com" className="text-primary hover:underline">corrections@example.com</a>. Please include:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-3">
                    <li>The URL of the article in question</li>
                    <li>A description of the error</li>
                    <li>A link to a credible source that supports your correction</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    We review all correction requests and respond within 48 hours. We do not issue corrections for satirical exaggerations, fictional scenarios, or comedic interpretations — only for factual errors in the real-world events that inspire our satire.
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Editorial Process */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold">Editorial Process</h2>
              </div>

              <div className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  Every article published on {branding.siteName} goes through a rigorous editorial process to ensure quality, accuracy, and adherence to our standards:
                </p>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-muted/30 p-6 rounded-lg">
                    <div className="text-primary font-bold text-lg mb-2">1. Research & Inspiration</div>
                    <p className="text-sm text-muted-foreground">
                      Our writers review credible news sources, public statements, and trending topics to identify events worthy of satirical treatment.
                    </p>
                  </div>
                  <div className="bg-muted/30 p-6 rounded-lg">
                    <div className="text-primary font-bold text-lg mb-2">2. Writing & Drafting</div>
                    <p className="text-sm text-muted-foreground">
                      Writers craft satirical articles that exaggerate, parody, or reimagine real events while maintaining clarity about the fictional nature of the content.
                    </p>
                  </div>
                  <div className="bg-muted/30 p-6 rounded-lg">
                    <div className="text-primary font-bold text-lg mb-2">3. Editorial Review</div>
                    <p className="text-sm text-muted-foreground">
                      Editors review each article for factual accuracy in the premise, adherence to our editorial principles, and quality of writing before publication.
                    </p>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed mt-6">
                  We publish multiple articles daily, covering a wide range of topics from politics and technology to entertainment and lifestyle. Our editorial team works around the clock to ensure timely, relevant, and high-quality satire.
                </p>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Community Guidelines */}
            <section>
              <h2 className="text-3xl font-bold mb-6">Community Guidelines</h2>

              <div className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  We welcome comments and discussion on our articles, but we expect all participants to engage respectfully and constructively. Comments that violate our community guidelines will be removed, and repeat offenders may be banned.
                </p>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Prohibited Content</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Hate speech, bigotry, or discrimination based on race, ethnicity, religion, gender, sexual orientation, or disability</li>
                    <li>Threats of violence or harassment toward individuals or groups</li>
                    <li>Spam, advertising, or self-promotion unrelated to the article</li>
                    <li>Personal attacks, insults, or ad hominem arguments</li>
                    <li>Misinformation or deliberate falsehoods presented as fact</li>
                    <li>Content that violates the privacy or legal rights of others</li>
                  </ul>
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  We encourage lively debate and disagreement, but we ask that all participants focus on ideas, not individuals. Satirical humor is welcome in comments, but cruelty is not.
                </p>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Contact */}
            <section>
              <h2 className="text-3xl font-bold mb-6">Contact the Editorial Team</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We value feedback from our readers and are committed to continuous improvement. If you have questions, concerns, or suggestions about our editorial standards, please reach out:
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong>General Inquiries:</strong> <a href="mailto:editorial@example.com" className="text-primary hover:underline">editorial@example.com</a><br />
                <strong>Corrections:</strong> <a href="mailto:corrections@example.com" className="text-primary hover:underline">corrections@example.com</a><br />
                <strong>Community Issues:</strong> <a href="mailto:moderation@example.com" className="text-primary hover:underline">moderation@example.com</a>
              </p>
            </section>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default EditorialStandardsPage;
