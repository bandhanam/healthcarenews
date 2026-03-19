import ProviderDirectoryPage from './ProviderDirectoryPage';

export default function PhysicianDirectoryPage() {
  return (
    <ProviderDirectoryPage
      config={{
        pageTitle: 'Physician Directory',
        pageBadge: 'Clinician Intelligence',
        pageSubtitle: 'Search and compare individual NPI clinicians by specialty, credential, and geography.',
        searchPlaceholder: 'Search physicians by name, NPI, specialty, or city...',
        fixedEntityType: '1',
        showEntityTypeFilter: false,
        defaultTab: 'search',
      }}
    />
  );
}
