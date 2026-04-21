'use client';

import { useState, useEffect, useCallback } from 'react';
import { babbloFunnel, ApiError } from '@/lib/api';
import type { FunnelStep, FunnelResponse } from '@/lib/api';

type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'custom';

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function presetToDates(preset: Preset): { from: string; to: string } {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  switch (preset) {
    case 'today':
      return { from: toDateStr(today), to: toDateStr(tomorrow) };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      return { from: toDateStr(yesterday), to: toDateStr(today) };
    }
    case '7d': {
      const sevenAgo = new Date(today);
      sevenAgo.setUTCDate(sevenAgo.getUTCDate() - 6);
      return { from: toDateStr(sevenAgo), to: toDateStr(tomorrow) };
    }
    case '30d': {
      const thirtyAgo = new Date(today);
      thirtyAgo.setUTCDate(thirtyAgo.getUTCDate() - 29);
      return { from: toDateStr(thirtyAgo), to: toDateStr(tomorrow) };
    }
    default:
      return { from: toDateStr(today), to: toDateStr(tomorrow) };
  }
}

export function useBabbloFunnel() {
  const [activePreset, setActivePreset] = useState<Preset>('today');
  const [dateFrom, setDateFrom] = useState(() => presetToDates('today').from);
  const [dateTo, setDateTo] = useState(() => presetToDates('today').to);

  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const [allEvents, setAllEvents] = useState<string[]>([]);
  const [configuredSteps, setConfiguredSteps] = useState<FunnelStep[]>([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveError, setConfigSaveError] = useState<string | null>(null);

  const [funnelData, setFunnelData] = useState<FunnelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [initialised, setInitialised] = useState(false);

  const fetchFunnel = useCallback(async (
    from: string,
    to: string,
    versions: string[],
    countries: string[],
    steps: FunnelStep[]
  ) => {
    const visibleSteps = steps.filter((s) => s.visible).map((s) => s.event);
    if (visibleSteps.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await babbloFunnel.getFunnel({
        from,
        to,
        versions: versions.length ? versions : undefined,
        countries: countries.length ? countries : undefined,
        steps: visibleSteps,
      });
      setFunnelData(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load funnel data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load filter options, events, and saved config on mount
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [filterOpts, eventsResp, configResp] = await Promise.all([
          babbloFunnel.getFilterOptions(),
          babbloFunnel.getEvents(),
          babbloFunnel.getConfig(),
        ]);
        if (cancelled) return;

        setAvailableVersions(filterOpts.versions);
        setAvailableCountries(filterOpts.countries);

        // Merge saved config with live events: saved steps first, new events appended unchecked
        const savedEvents = new Set(configResp.steps.map((s) => s.event));
        const merged: FunnelStep[] = [
          ...configResp.steps,
          ...eventsResp.events
            .filter((e) => !savedEvents.has(e))
            .map((e) => ({ event: e, visible: false })),
        ];
        setAllEvents(eventsResp.events);
        setConfiguredSteps(merged);
        setInitialised(true);
      } catch {
        if (!cancelled) setError('Failed to load funnel configuration');
      }
    }
    void init();
    return () => { cancelled = true; };
  }, []);

  // Fetch funnel data once initialised
  useEffect(() => {
    if (!initialised) return;
    void fetchFunnel(dateFrom, dateTo, selectedVersions, selectedCountries, configuredSteps);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialised]);

  const setPreset = useCallback((preset: Preset) => {
    const { from, to } = presetToDates(preset);
    setActivePreset(preset);
    setDateFrom(from);
    setDateTo(to);
    if (initialised) {
      void fetchFunnel(from, to, selectedVersions, selectedCountries, configuredSteps);
    }
  }, [initialised, selectedVersions, selectedCountries, configuredSteps, fetchFunnel]);

  const setDateRange = useCallback((from: string, to: string) => {
    setActivePreset('custom');
    setDateFrom(from);
    setDateTo(to);
    if (initialised) {
      void fetchFunnel(from, to, selectedVersions, selectedCountries, configuredSteps);
    }
  }, [initialised, selectedVersions, selectedCountries, configuredSteps, fetchFunnel]);

  const handleVersionsChange = useCallback((versions: string[]) => {
    setSelectedVersions(versions);
    if (initialised) {
      void fetchFunnel(dateFrom, dateTo, versions, selectedCountries, configuredSteps);
    }
  }, [initialised, dateFrom, dateTo, selectedCountries, configuredSteps, fetchFunnel]);

  const handleCountriesChange = useCallback((countries: string[]) => {
    setSelectedCountries(countries);
    if (initialised) {
      void fetchFunnel(dateFrom, dateTo, selectedVersions, countries, configuredSteps);
    }
  }, [initialised, dateFrom, dateTo, selectedVersions, configuredSteps, fetchFunnel]);

  const applyConfig = useCallback(async () => {
    setIsSavingConfig(true);
    setConfigSaveError(null);
    try {
      await babbloFunnel.saveConfig(configuredSteps);
    } catch {
      setConfigSaveError('Failed to save configuration');
    } finally {
      setIsSavingConfig(false);
    }
    void fetchFunnel(dateFrom, dateTo, selectedVersions, selectedCountries, configuredSteps);
  }, [configuredSteps, dateFrom, dateTo, selectedVersions, selectedCountries, fetchFunnel]);

  const refetch = useCallback(() => {
    void fetchFunnel(dateFrom, dateTo, selectedVersions, selectedCountries, configuredSteps);
  }, [dateFrom, dateTo, selectedVersions, selectedCountries, configuredSteps, fetchFunnel]);

  return {
    activePreset, setPreset,
    dateFrom, dateTo, setDateRange,
    availableVersions, selectedVersions, setSelectedVersions: handleVersionsChange,
    availableCountries, selectedCountries, setSelectedCountries: handleCountriesChange,
    allEvents, configuredSteps, setConfiguredSteps,
    applyConfig, isSavingConfig, configSaveError,
    funnelData, loading, error, refetch,
  };
}
