import ProviderDirectoryPage from './ProviderDirectoryPage';

export default function HospitalsDirectoryPage() {
  return (
    <ProviderDirectoryPage
      config={{
        pageTitle: 'Hospitals Directory',
        pageBadge: 'Organization Intelligence',
        pageSubtitle: 'Explore hospitals and provider organizations by location, taxonomy, and contact details.',
        searchPlaceholder: 'Search hospitals by name, NPI, city, or specialty...',
        fixedEntityType: '2',
        showEntityTypeFilter: false,
        defaultTab: 'search',
      }}
    />
  );
}
