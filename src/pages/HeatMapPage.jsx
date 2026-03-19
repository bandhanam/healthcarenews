import ProviderDirectoryPage from './ProviderDirectoryPage';

export default function HeatMapPage() {
  return (
    <ProviderDirectoryPage
      config={{
        pageTitle: 'Coverage Heat Map',
        pageBadge: 'Geographic Intelligence',
        pageSubtitle: 'Visualize provider density, regional gaps, and market coverage across the U.S.',
        searchTabLabel: 'Search Coverage',
        analyticsTabLabel: 'Regional Analytics',
        mapTabLabel: 'Heat Map',
        searchPlaceholder: 'Search coverage by state, city, or provider name...',
        defaultTab: 'map',
      }}
    />
  );
}
