import TenantLayout from "@/layouts/TenantLayout";
import { Link } from "wouter";
import { DollarSign, ShoppingCart, ShoppingBag, Star, Megaphone, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const monetizationCards = [
  {
    title: "Google AdSense",
    description: "Configure display ads, ad slots, and revenue tracking for Google AdSense.",
    icon: DollarSign,
    href: "/admin/settings/adsense",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Amazon Associates",
    description: "Set up Amazon affiliate links, associate ID, and product recommendation widgets.",
    icon: ShoppingCart,
    href: "/admin/settings/amazon",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    title: "Sponsorship",
    description: "Manage sponsored content placements, partner logos, and sponsor attribution.",
    icon: Star,
    href: "/admin/settings/sponsor",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "Merch Store",
    description: "Configure your merchandise store, products, and Printful integration.",
    icon: ShoppingBag,
    href: "/admin/settings/merch",
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

export default function AdminMonetization() {
  return (
    <TenantLayout pageTitle="Monetization" pageSubtitle="Manage all revenue streams and monetization settings" section="Settings">
      <div className="p-6 max-w-4xl space-y-6">
        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {monetizationCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${card.color}`} />
                      </div>
                      <CardTitle className="text-base">{card.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">{card.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* KB Link */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-lg px-4 py-3 bg-muted/20">
          <ExternalLink className="w-4 h-4 shrink-0" />
          <span>
            Need help?{" "}
            <a
              href="https://docs.jaime.io/monetization"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary transition-colors"
            >
              Read the Monetization guide
            </a>
          </span>
        </div>
      </div>
    </TenantLayout>
  );
}
