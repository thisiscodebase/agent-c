"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useProfile } from "~/hooks/use-profile";

export default function ProfilePage() {
  const { profile, isLoading, saveProfile, isSaving, saveError, timezones, locales } = useProfile();

  const timezoneItems = useMemo(
    () => [
      { value: null, label: "Select a timezone" },
      ...timezones.map((tz) => ({ value: tz.value, label: `${tz.label} — ${tz.description}` })),
    ],
    [timezones]
  );
  const localeItems = useMemo(
    () => [
      { value: null, label: "Select a locale" },
      ...locales.map((l) => ({ value: l.value, label: l.label })),
    ],
    [locales]
  );

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [locale, setLocale] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setTimezone(profile.timezone);
    setLocale(profile.locale);
    setBio(profile.bio);
  }, [profile]);

  if (isLoading || !profile) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="profile-name">Name</label>
          <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="profile-email">Email</label>
          <Input disabled id="profile-email" value={profile.email} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Timezone</span>
          <Select
            items={timezoneItems}
            value={timezone || null}
            onValueChange={(value) => setTimezone(value ?? "")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label} — {tz.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Locale</span>
          <Select
            items={localeItems}
            value={locale || null}
            onValueChange={(value) => setLocale(value ?? "")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locales.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="profile-bio">Bio</label>
          <Textarea id="profile-bio" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>

        {saveError ? <p className="text-sm text-destructive">{saveError.message}</p> : null}
      </CardContent>
      <CardFooter>
        <Button
          disabled={isSaving}
          onClick={() => void saveProfile({ name, timezone, locale, bio })}
        >
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </CardFooter>
    </Card>
  );
}
