'use client';

import { Layout } from '@/components/layout';
import { Toast } from '@/components/ui';
import { FunnelFilterBar } from '@/components/babblo/FunnelFilterBar';
import { FunnelTable } from '@/components/babblo/FunnelTable';
import { FunnelConfigurator } from '@/components/babblo/FunnelConfigurator';
import { useBabbloFunnel } from '@/hooks/useBabbloFunnel';

export default function BabbloFunnelPage() {
  const {
    activePreset, setPreset,
    dateFrom, dateTo, setDateRange,
    availableVersions, selectedVersions, setSelectedVersions,
    availableCountries, selectedCountries, setSelectedCountries,
    configuredSteps, setConfiguredSteps,
    applyConfig, isSavingConfig, configSaveError,
    funnelData, loading, error, refetch,
  } = useBabbloFunnel();

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Filter bar */}
        <FunnelFilterBar
          activePreset={activePreset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPresetChange={setPreset}
          onDateRangeChange={setDateRange}
          availableVersions={availableVersions}
          selectedVersions={selectedVersions}
          onVersionsChange={setSelectedVersions}
          availableCountries={availableCountries}
          selectedCountries={selectedCountries}
          onCountriesChange={setSelectedCountries}
        />

        {/* Body */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Funnel table */}
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <FunnelTable
              data={funnelData}
              steps={configuredSteps}
              loading={loading}
              error={error}
              selectedVersions={selectedVersions}
              onRetry={refetch}
            />
          </div>

          {/* Step configurator */}
          <div className="md:w-72 shrink-0 border-t md:border-t-0 md:border-l border-background-tertiary overflow-auto">
            <FunnelConfigurator
              steps={configuredSteps}
              onChange={setConfiguredSteps}
              onApply={applyConfig}
              isSaving={isSavingConfig}
            />
          </div>
        </div>
      </div>

      {/* Save error toast */}
      {configSaveError && (
        <Toast message={configSaveError} onDismiss={() => {}} />
      )}
    </Layout>
  );
}
