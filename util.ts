export function isIgnoredElement(element: string): boolean {
  const ignoredElements = [
    "wrapMigratedService",
    "wrapFullyMigratedService",
    "wrapCloudAgnosticService",
    "AbstractRepository",
    "wrapService",
    "ensure_indexes",
  ];
  if (ignoredElements.filter((e) => e === element).length > 0) {
    return true;
  }
  if (/migrated.*Service.*/.test(element)) {
    return true;
  }
  return false;
}

export function isCoveredByStory(element: string): boolean {
  const coveredByStory = [
    "RequestReportingRepository",
    "MessageFeedRepository",
    "CandidateProfileSharesService",
    "CandidateScoringService",
    "CVParsingService",
    "CandidateBlockedRepository",
    "CandidateDmsDocumentsService",
    "DeletedCandidateRepository",
    "RequestCampaignStateRepository",
    "OrganizationDataRepository",
    "AcceptedQuoteRepository",
    "OrganizationPoolRepository",
    "OrganizationPricesConfigRepository",
    "PasswordRepository",
    "RequestCandidatesPresenceRepository",
    "SalesDashboardTodosRepository",
    "UserActivityRepository",
    "WatchlistRepository",
    "QuoteRepository",
    "SalesforceAPIService",
    "GeolocationRepository",
    "FavoritesRepository",
    "OrganizationCandidateVisibilityRepository",
    "ApiTokenRepository",
    "RequestTemplatesRepository",
    "CandidateParsedCvsRepository",
    "ExternalRequestRepository",
    "PermanentPlacementRequestService",
    "PermanentPlacementRequestRepository",
  ];
  return coveredByStory.filter((e) => e === element).length > 0;
}

export const assertNever = (value: never): never => {
  throw new Error(`Failed never assertion for value ${value}`);
};
