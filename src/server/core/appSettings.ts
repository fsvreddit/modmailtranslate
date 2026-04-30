export enum AppSetting {
    // Sub-scoped settings
    Language = "language",
    ContinuousTranslation = "continuousTranslation",
    ShowQuotaLevels = "showQuotaLevels",

    // App-scoped settings
    GlobalAPIKey = "openAPIKey",
    /**
     * @deprecated Must be kept for backwards compatibility with v1.0.0, but no longer used.
     */
    FreeTrialUsesAvailable = "freeTries",
    FreeTranslationsPerMonth = "freeTranslationsPerMonth",
    OpenAIModel = "openAIModel",
}
