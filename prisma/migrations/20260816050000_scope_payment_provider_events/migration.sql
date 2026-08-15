DROP INDEX "PaymentProviderEvent_providerEventId_key";

CREATE UNIQUE INDEX "PaymentProviderEvent_provider_providerEventId_key"
ON "PaymentProviderEvent"("provider", "providerEventId");
