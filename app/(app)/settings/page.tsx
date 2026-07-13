"use client";

import { useEffect, useMemo, useState } from "react";
import { SettingsGroup, SettingsRow } from "~/components/settings/settings-group";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useProfile } from "~/hooks/use-profile";

export default function PreferencesPage() {
  const { profile, isLoading, saveProfile, isSaving, saveError, timezones, locales } =
    useProfile();

  const timezoneItems = useMemo(
    () => [
      { value: null, label: "Select a timezone" },
      ...timezones.map((tz) => ({ value: tz.value, label: `${tz.label} — ${tz.description}` })),
    ],
    [timezones],
  );
  const localeItems = useMemo(
    () => [
      { value: null, label: "Select a locale" },
      ...locales.map((locale) => ({ value: locale.value, label: locale.label })),
    ],
    [locales],
  );

  const [timezone, setTimezone] = useState("");
  const [locale, setLocale] = useState("");

  useEffect(() => {
    if (!profile) {
      return;
    }
    setTimezone(profile.timezone);
    setLocale(profile.locale);
  }, [profile]);

  if (isLoading || !profile) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const dirty = timezone !== profile.timezone || locale !== profile.locale;

  return (
    <div className="flex flex-col gap-6">
      <SettingsGroup>
        <SettingsRow
          description="Used when Agent C reasons about times and schedules."
          title="Timezone"
        >
          <Select
            items={timezoneItems}
            value={timezone || null}
            onValueChange={(value) => setTimezone(value ?? "")}
          >
            <SelectTrigger className="w-full min-w-[12rem]">
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
        </SettingsRow>

        <SettingsRow
          description="Language preference for Agent C responses when relevant."
          title="Locale"
        >
          <Select
            items={localeItems}
            value={locale || null}
            onValueChange={(value) => setLocale(value ?? "")}
          >
            <SelectTrigger className="w-full min-w-[12rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locales.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsGroup>

      <div className="flex items-center gap-3">
        <Button
          disabled={!dirty || isSaving}
          onClick={() => void saveProfile({ timezone, locale })}
        >
          {isSaving ? "Saving…" : "Save preferences"}
        </Button>
        {saveError ? (
          <p className="text-sm text-destructive">Failed to save preferences.</p>
        ) : null}
      </div>
    </div>
  );
}
