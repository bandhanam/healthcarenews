import ProviderDirectoryPage from './ProviderDirectoryPage';

export default function SpecialtyExplorerPage() {
  return (
    <ProviderDirectoryPage
      config={{
        pageTitle: 'Specialty Explorer',
        pageBadge: 'Specialty Intelligence',
        pageSubtitle: 'Discover provider concentration, top taxonomies, and specialty coverage patterns.',
        searchTabLabel: 'Browse Providers',
        analyticsTabLabel: 'Specialty Analytics',
        mapTabLabel: 'Distribution Heat Map',
        searchPlaceholder: 'Search specialties, taxonomies, or provider names...',
        defaultTab: 'analytics',
      }}
    />
  );
}
