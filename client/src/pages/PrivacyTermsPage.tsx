import Navbar from "@/components/Navbar";
import { useBranding } from "@/hooks/useBranding";
import Footer from "@/components/Footer";
import { Shield, FileText, Cookie, Mail, Eye, Scale } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";

const PrivacyTermsPage = () => {
  const { branding } = useBranding();
  const siteName = branding.siteName || "";
  usePageSEO({
    title: `Privacy Policy & Terms of Service — ${siteName}`,
    description: `${siteName}'s privacy policy and terms of service. Learn how we collect, use, and protect your data, and the terms governing your use of our site.`,
    keywords: "privacy policy, terms of service, data protection, cookies, user rights",
    defaultTitle: siteName,
  });
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-16">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy & Terms of Service</h1>
            <p className="text-lg text-gray-300">
              Your privacy matters. Here's how we collect, use, and protect your information.
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
            
            {/* Privacy Policy */}
            <section id="privacy">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold">Privacy Policy</h2>
              </div>

              <div className="prose prose-lg max-w-none space-y-8">
                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Information We Collect
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We collect information you provide directly to us, such as when you subscribe to our newsletter, leave comments, or contact us. This may include your name, email address, and any other information you choose to provide. We also automatically collect certain information about your device when you visit our site, including your IP address, browser type, operating system, and usage data through cookies and similar technologies.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Cookie className="w-5 h-5 text-primary" />
                    Cookies and Tracking
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and serve personalized advertisements. Cookies are small data files stored on your device that help us remember your preferences and understand how you interact with our content.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <strong>Third-Party Advertising:</strong> We use Google AdSense to serve advertisements on our site. Google and its partners may use cookies to serve ads based on your prior visits to our website or other websites. You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google's Ads Settings</a> or <a href="http://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">aboutads.info</a>.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    Newsletter and Communications
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    When you subscribe to our newsletter, we collect your email address to send you updates, new articles, and occasional promotional content. You can unsubscribe at any time by clicking the "unsubscribe" link at the bottom of any email we send. We will never sell, rent, or share your email address with third parties for their marketing purposes without your explicit consent.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">How We Use Your Information</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Send you newsletters and updates (with your consent)</li>
                    <li>Respond to your comments, questions, and requests</li>
                    <li>Analyze usage patterns and optimize site performance</li>
                    <li>Detect, prevent, and address technical issues or fraudulent activity</li>
                    <li>Serve relevant advertisements through Google AdSense</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Data Security</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We take reasonable measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security. We encourage you to use strong passwords and keep your account credentials confidential.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Your Rights (GDPR & CCPA)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    If you are a resident of the European Union or California, you have certain rights regarding your personal information:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li><strong>Access:</strong> You can request a copy of the personal information we hold about you.</li>
                    <li><strong>Correction:</strong> You can request that we correct inaccurate or incomplete information.</li>
                    <li><strong>Deletion:</strong> You can request that we delete your personal information, subject to certain exceptions.</li>
                    <li><strong>Opt-Out:</strong> You can opt out of receiving marketing communications at any time.</li>
                    <li><strong>Data Portability:</strong> You can request a copy of your data in a structured, machine-readable format.</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    To exercise any of these rights, please contact us at <a href={`mailto:${branding.privacyEmail}`} className="text-primary hover:underline">{branding.privacyEmail}</a>.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Children's Privacy</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our site is not directed to children under the age of 13, and we do not knowingly collect personal information from children. If we become aware that we have collected information from a child under 13, we will take steps to delete it promptly.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Changes to This Policy</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the updated policy on this page and updating the "Last updated" date above. Your continued use of our site after such changes constitutes your acceptance of the updated policy.
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Terms of Service */}
            <section id="terms">
              <div className="flex items-center gap-3 mb-6">
                <Scale className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold">Terms of Service</h2>
              </div>

              <div className="prose prose-lg max-w-none space-y-8">
                <div>
                  <h3 className="text-xl font-semibold mb-3">Acceptance of Terms</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    By accessing and using {branding.siteName} ("the Site"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Site. We reserve the right to modify these terms at any time, and your continued use of the Site constitutes acceptance of any changes.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {branding.genre ? `${branding.genre.charAt(0).toUpperCase() + branding.genre.slice(1)} Content Disclaimer` : 'Content Disclaimer'}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    <strong>{branding.siteName} is a {branding.genre} news publication.</strong> All articles, headlines, and content published on this site are works of fiction, parody, and {branding.genre}. They are intended for entertainment and commentary purposes only and should not be taken as factual reporting.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {branding.genre?.toLowerCase().includes('satire') ? 'While our satire is inspired by real-world events and public figures, the specific stories, quotes, and scenarios we present are fabricated for comedic and critical effect. We do not intend to deceive readers into believing our content is legitimate news. Any resemblance to actual persons, living or dead, or actual events is purely coincidental and intended for satirical purposes.' : `The content published on ${branding.siteName || 'this site'} is intended for informational and entertainment purposes. While our articles are inspired by real-world events, the analysis, commentary, and perspectives presented are those of the editorial team. Readers should verify information independently before making decisions based on our content.`}
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">User Conduct</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    When using our Site, you agree to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Not use the Site for any unlawful purpose or in violation of these Terms</li>
                    <li>Not post or transmit any content that is defamatory, obscene, harassing, or otherwise objectionable</li>
                    <li>Not impersonate any person or entity, or falsely state or misrepresent your affiliation with any person or entity</li>
                    <li>Not interfere with or disrupt the Site or servers or networks connected to the Site</li>
                    <li>Not attempt to gain unauthorized access to any portion of the Site or any other systems or networks</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Intellectual Property</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    All content on {branding.siteName}, including text, graphics, logos, images, and software, is the property of {branding.companyName} or its content suppliers and is protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any content on the Site without our express written permission. However, you may share links to our articles on social media and other platforms, provided you do not alter the content or misrepresent it as factual news.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Comments and User-Generated Content</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    By posting comments or other content on the Site, you grant {branding.companyName} a non-exclusive, royalty-free, perpetual, and worldwide license to use, reproduce, modify, and display such content. You represent and warrant that you own or have the necessary rights to any content you post and that such content does not violate any third-party rights or applicable laws. We reserve the right to remove any content that violates these Terms or that we deem inappropriate at our sole discretion.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Third-Party Links and Advertising</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our Site may contain links to third-party websites and advertisements served by third-party ad networks (including Google AdSense). We are not responsible for the content, privacy practices, or terms of service of any third-party sites. Your interactions with third-party advertisers and any resulting transactions are solely between you and the advertiser. We encourage you to review the privacy policies and terms of service of any third-party sites you visit.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Disclaimer of Warranties</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    THE SITE AND ALL CONTENT ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SITE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Limitation of Liability</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    TO THE FULLEST EXTENT PERMITTED BY LAW, THE SITE OPERATOR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR USE OR INABILITY TO USE THE SITE; (B) ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SERVERS AND/OR ANY PERSONAL INFORMATION STORED THEREIN; (C) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE SITE; OR (D) ANY BUGS, VIRUSES, OR THE LIKE THAT MAY BE TRANSMITTED TO OR THROUGH THE SITE BY ANY THIRD PARTY.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Indemnification</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You agree to indemnify, defend, and hold harmless {branding.companyName} and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your access to or use of the Site, your violation of these Terms, or your violation of any third-party rights.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Governing Law and Dispute Resolution</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any disputes arising out of or relating to these Terms or the Site shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except that either party may seek injunctive or other equitable relief in any court of competent jurisdiction.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Contact Us</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    If you have any questions about this Privacy Policy or Terms of Service, please contact us at:
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    <strong>Email:</strong> <a href={`mailto:${branding.legalEmail}`} className="text-primary hover:underline">{branding.legalEmail}</a><br />
                    <strong>Mail:</strong> {branding.companyName} Legal Department
                  </p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyTermsPage;
