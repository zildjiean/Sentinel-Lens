"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/types/database";

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "analyst", label: "Analyst" },
  { value: "viewer", label: "Viewer" },
];

export function UserManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    async function loadProfiles() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (data) setProfiles(data);
    }
    loadProfiles();
  }, []);

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const supabase = createClient();
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    setProfiles((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
    );
  }

  return (
    <Card variant="low">
      <h2 className="font-headline text-xl font-semibold text-on-surface mb-4">User Management</h2>

      <div className="space-y-3">
        {profiles.map((profile) => (
          <div key={profile.id} className="flex items-center gap-3 py-2 border-b border-outline-variant/10">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
              {(profile.display_name || profile.email)?.[0]?.toUpperCase() || "?"}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-on-surface truncate">
                {profile.display_name || "Unnamed User"}
              </p>
              <p className="text-xs text-on-surface-variant truncate">{profile.email}</p>
            </div>

            <div className="w-32 shrink-0">
              <Select
                options={roleOptions}
                value={profile.role}
                onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
              />
            </div>
          </div>
        ))}

        {profiles.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-4">No users found.</p>
        )}
      </div>
    </Card>
  );
}
