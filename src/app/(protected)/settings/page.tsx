"use client";

import { useState } from "react";
import { LLMConfig } from "@/components/settings/LLMConfig";
import { RSSManager } from "@/components/settings/RSSManager";
import { UserManager } from "@/components/settings/UserManager";
import { ReportTemplates } from "@/components/settings/ReportTemplates";
import { TokenBudget } from "@/components/settings/TokenBudget";
import { type LucideIcon, Bot, Rss, FileText, Users } from "lucide-react";

const tabs: { id: string; label: string; icon: LucideIcon; description: string }[] = [
  { id: "llm", label: "LLM Provider", icon: Bot, description: "API keys, model selection, and token budget" },
  { id: "rss", label: "RSS Sources", icon: Rss, description: "Manage news feeds and fetch schedule" },
  { id: "reports", label: "Report Templates", icon: FileText, description: "Customize report generation prompts" },
  { id: "users", label: "User Management", icon: Users, description: "Create users and assign roles" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("llm");

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
          Settings
        </h1>
        <p className="text-sm text-on-surface-variant font-light">
          Configure LLM providers, RSS sources, report templates, and manage users.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <nav className="lg:w-56 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left whitespace-nowrap lg:whitespace-normal transition-all duration-200 min-w-fit lg:min-w-0 w-full ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-transparent"
                }`}
              >
                <tab.icon className={`w-5 h-5 flex-shrink-0 ${
                  activeTab === tab.id ? "text-primary" : "text-on-surface-variant"
                }`} />
                <div className="hidden lg:block">
                  <p className="text-sm font-medium">{tab.label}</p>
                  <p className="text-[10px] text-on-surface-variant/70 mt-0.5 leading-tight">
                    {tab.description}
                  </p>
                </div>
                <span className="lg:hidden text-xs font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Tab indicator for mobile */}
          <div className="lg:hidden flex items-center gap-2 text-on-surface-variant mb-2">
            {(() => {
              const ActiveIcon = tabs.find((t) => t.id === activeTab)?.icon;
              return ActiveIcon ? <ActiveIcon className="w-5 h-5 text-primary" /> : null;
            })()}
            <span className="text-xs text-on-surface-variant/70">
              {tabs.find((t) => t.id === activeTab)?.description}
            </span>
          </div>

          {activeTab === "llm" && (
            <>
              <LLMConfig />
              <TokenBudget />
            </>
          )}

          {activeTab === "rss" && <RSSManager />}

          {activeTab === "reports" && <ReportTemplates />}

          {activeTab === "users" && <UserManager />}
        </div>
      </div>
    </div>
  );
}
