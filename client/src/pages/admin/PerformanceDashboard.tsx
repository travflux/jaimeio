import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import OverviewTab from "./performance/OverviewTab";
import PublicationsTab from "./performance/PublicationsTab";
import UsersTab from "./performance/UsersTab";
import SocialTab from "./performance/SocialTab";
import SmsTab from "./performance/SmsTab";
import EmailTab from "./performance/EmailTab";
import AdvertisingTab from "./performance/AdvertisingTab";
import WebSeoTab from "./performance/WebSeoTab";
import RevenueTab from "./performance/RevenueTab";
import AiInsightsTab from "./performance/AiInsightsTab";
import {
  BarChart2, Globe, Users, Share2, MessageSquare, Mail,
  TrendingUp, Search, DollarSign, Sparkles,
} from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "publications", label: "Publications", icon: Globe },
  { id: "users", label: "Users", icon: Users },
  { id: "social", label: "Social", icon: Share2 },
  { id: "sms", label: "SMS", icon: MessageSquare },
  { id: "email", label: "Email", icon: Mail },
  { id: "advertising", label: "Advertising", icon: TrendingUp },
  { id: "web-seo", label: "SEO & GEO", icon: Search },
  { id: "revenue", label: "Revenue & Attribution", icon: DollarSign },
  { id: "ai-insights", label: "AI Insights", icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PERIODS = ["7d", "30d", "90d"] as const;

export default function PerformanceDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [period, setPeriod] = useState<string>("30d");

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab />;
      case "publications": return <PublicationsTab />;
      case "users": return <UsersTab />;
      case "social": return <SocialTab />;
      case "sms": return <SmsTab />;
      case "email": return <EmailTab />;
      case "advertising": return <AdvertisingTab />;
      case "web-seo": return <WebSeoTab />;
      case "revenue": return <RevenueTab />;
      case "ai-insights": return <AiInsightsTab />;
    }
  };

  return (
    <AdminLayout>
      {/* Dark Header */}
      <div className="-mx-4 lg:-mx-8 mb-6">
        <div className="bg-[#0f172a] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white font-headline">Performance Dashboard</h1>
              <p className="text-xs text-white/50">Real-time analytics across all channels</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p
                    ? "bg-white text-[#0f172a]"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Bar */}
        <div className="border-b bg-card px-4 overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-8">
        {renderTab()}
      </div>
    </AdminLayout>
  );
}
