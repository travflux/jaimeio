/**
 * Setup Wizard
 * 
 * White-label configuration wizard for new client deployments.
 * Run this once during initial setup to customize branding.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Mail, FileText, CheckCircle } from "lucide-react";
import type { SiteConfig } from "../../../shared/siteConfig";

export function SetupWizard() {
  const [config, setConfig] = useState<Partial<SiteConfig>>({
    siteName: "",
    tagline: "",
    description: "",
    logo: { url: "", alt: "" },
    colors: {
      primary: "#dc2626",
      secondary: "#1e40af",
      background: "#ffffff",
      text: "#0a0a0a"
    },
    contact: { email: "" },
    content: {
      genre: "",
      tone: "",
      defaultCategories: []
    },
    seo: {
      keywords: [],
      ogImage: "",
      twitterCard: "summary_large_image"
    },
    legal: {
      companyName: "",
      foundedYear: new Date().getFullYear()
    }
  });

  const [currentStep, setCurrentStep] = useState<"brand" | "content" | "contact" | "review">("brand");

  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
      const keys = path.split('.');
      const newConfig = { ...prev };
      let current: any = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const handleSave = async () => {
    // In production, this would save to database or generate config file
    console.log("Saving configuration:", config);
    
    // For now, just download as JSON
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'site-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Content Engine Setup</h1>
        <p className="text-muted-foreground">Configure your white-label content automation platform</p>
      </div>

      <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        {/* Brand Identity */}
        <TabsContent value="brand">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Brand Identity
              </CardTitle>
              <CardDescription>Define your site's name, tagline, and visual identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="siteName">Site Name *</Label>
                <Input
                  id="siteName"
                  value={config.siteName}
                  onChange={(e) => updateConfig('siteName', e.target.value)}
                    placeholder="e.g., The Daily Brief"
                />
              </div>

              <div>
                <Label htmlFor="tagline">Tagline *</Label>
                <Input
                  id="tagline"
                  value={config.tagline}
                  onChange={(e) => updateConfig('tagline', e.target.value)}
                  placeholder="e.g., News with a twist"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => updateConfig('description', e.target.value)}
                  placeholder="Brief description of your site"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={config.logo?.url}
                    onChange={(e) => updateConfig('logo.url', e.target.value)}
                    placeholder="/logo.svg"
                  />
                </div>
                <div>
                  <Label htmlFor="logoAlt">Logo Alt Text</Label>
                  <Input
                    id="logoAlt"
                    value={config.logo?.alt}
                    onChange={(e) => updateConfig('logo.alt', e.target.value)}
                    placeholder="Site Logo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={config.colors?.primary}
                      onChange={(e) => updateConfig('colors.primary', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={config.colors?.primary}
                      onChange={(e) => updateConfig('colors.primary', e.target.value)}
                      placeholder="#dc2626"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={config.colors?.secondary}
                      onChange={(e) => updateConfig('colors.secondary', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={config.colors?.secondary}
                      onChange={(e) => updateConfig('colors.secondary', e.target.value)}
                      placeholder="#1e40af"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={() => setCurrentStep("content")} className="w-full">
                Next: Content Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Settings */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Content Settings
              </CardTitle>
              <CardDescription>Configure content generation parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="genre">Content Genre</Label>
                  <Input
                    id="genre"
                    value={config.content?.genre}
                    onChange={(e) => updateConfig('content.genre', e.target.value)}
                    placeholder="e.g., news, tech, business"
                  />
                </div>
                <div>
                  <Label htmlFor="tone">Content Tone</Label>
                  <Input
                    id="tone"
                    value={config.content?.tone}
                    onChange={(e) => updateConfig('content.tone', e.target.value)}
                    placeholder="e.g., professional, authoritative"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="categories">Default Categories (comma-separated)</Label>
                <Textarea
                  id="categories"
                  value={config.content?.defaultCategories?.join(', ')}
                  onChange={(e) => updateConfig('content.defaultCategories', e.target.value.split(',').map(s => s.trim()))}
                  placeholder="Politics, Business, Technology, Science"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="keywords">SEO Keywords (comma-separated)</Label>
                <Textarea
                  id="keywords"
                  value={config.seo?.keywords?.join(', ')}
                  onChange={(e) => updateConfig('seo.keywords', e.target.value.split(',').map(s => s.trim()))}
                  placeholder="news, current events, commentary"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentStep("brand")}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep("contact")} className="flex-1">
                  Next: Contact Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Information */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Contact & Legal
              </CardTitle>
              <CardDescription>Provide contact information and legal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Contact Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={config.contact?.email}
                  onChange={(e) => updateConfig('contact.email', e.target.value)}
                  placeholder="contact@yoursite.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="twitter">Twitter Handle</Label>
                  <Input
                    id="twitter"
                    value={config.contact?.twitter}
                    onChange={(e) => updateConfig('contact.twitter', e.target.value)}
                    placeholder="@yoursite"
                  />
                </div>
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={config.contact?.facebook}
                    onChange={(e) => updateConfig('contact.facebook', e.target.value)}
                    placeholder="facebook.com/yoursite"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={config.legal?.companyName}
                  onChange={(e) => updateConfig('legal.companyName', e.target.value)}
                  placeholder="Your Company LLC"
                />
              </div>

              <div>
                <Label htmlFor="foundedYear">Founded Year</Label>
                <Input
                  id="foundedYear"
                  type="number"
                  value={config.legal?.foundedYear}
                  onChange={(e) => updateConfig('legal.foundedYear', parseInt(e.target.value))}
                  placeholder="2026"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentStep("content")}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep("review")} className="flex-1">
                  Review Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review */}
        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Review Configuration
              </CardTitle>
              <CardDescription>Review and save your configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-sm overflow-auto max-h-96">
                  {JSON.stringify(config, null, 2)}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentStep("contact")}>
                  Back
                </Button>
                <Button onClick={handleSave} className="flex-1">
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
