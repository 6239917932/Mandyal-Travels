'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { readJsonResponse } from '@/lib/api/clientResponse';
import {
  HOTEL_OPERATIONAL_DOCUMENT_TEMPLATES,
  HOTEL_OPERATIONAL_DOCUMENT_THEMES,
} from '@/lib/pms/operationalDocuments';

type DocumentProperty = {
  contactEmail: string;
  contactPhone: string;
  displayName: string;
  documentFooterText: string;
  documentHeaderText: string;
  documentShowContact: boolean;
  documentTemplate: string;
  documentTheme: string;
  documentVersion: number;
  id: string;
};

type ApiResult = { data?: DocumentProperty; error?: { message?: string } };

function displayValue(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function OperationalDocumentSettings({
  canManage,
  properties,
}: {
  canManage: boolean;
  properties: DocumentProperty[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pendingPropertyId, setPendingPropertyId] = useState<string>();

  async function save(property: DocumentProperty, formData: FormData) {
    setMessage('');
    setPendingPropertyId(property.id);
    const response = await fetch(
      `/api/v1/partner/document-templates/${encodeURIComponent(property.id)}`,
      {
        body: JSON.stringify({
          expectedVersion: property.documentVersion,
          footerText: formData.get('footerText'),
          headerText: formData.get('headerText'),
          showPropertyContact: formData.get('showPropertyContact') === 'on',
          template: formData.get('template'),
          theme: formData.get('theme'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      },
    );
    const result = await readJsonResponse<ApiResult>(response);
    setPendingPropertyId(undefined);
    if (!response.ok || !result?.data) {
      setMessage(result?.error?.message ?? 'The operational document settings could not be saved.');
      return;
    }
    setMessage(`${result.data.displayName} document settings were saved.`);
    router.refresh();
  }

  return (
    <>
      {message ? (
        <p className="partner-property-manager__success" role="status">
          {message}
        </p>
      ) : null}
      <div className="operational-document-settings">
        {properties.map((property) => (
          <section className="operational-document-settings__property" key={property.id}>
            <form action={(formData) => void save(property, formData)} className="supplier-form">
              <div>
                <p className="hotel-page__eyebrow">Property document profile</p>
                <h2>{property.displayName}</h2>
                <p>
                  These choices apply to operational booking documents only. They never alter tax
                  evidence, invoice numbering, booking values, or payment records.
                </p>
              </div>
              <div className="supplier-form__grid">
                <label className="ui-field">
                  <span className="ui-field__label">Document layout</span>
                  <select
                    className="ui-input"
                    defaultValue={property.documentTemplate}
                    disabled={!canManage}
                    name="template"
                  >
                    {HOTEL_OPERATIONAL_DOCUMENT_TEMPLATES.map((template) => (
                      <option key={template} value={template}>
                        {displayValue(template)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ui-field">
                  <span className="ui-field__label">Colour theme</span>
                  <select
                    className="ui-input"
                    defaultValue={property.documentTheme}
                    disabled={!canManage}
                    name="theme"
                  >
                    {HOTEL_OPERATIONAL_DOCUMENT_THEMES.map((theme) => (
                      <option key={theme} value={theme}>
                        {displayValue(theme)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="ui-field">
                <span className="ui-field__label">Optional document heading</span>
                <input
                  className="ui-input"
                  defaultValue={property.documentHeaderText}
                  disabled={!canManage}
                  maxLength={120}
                  name="headerText"
                  placeholder="Thank you for choosing our hotel"
                />
              </label>
              <label className="ui-field">
                <span className="ui-field__label">Optional document footer</span>
                <textarea
                  className="ui-input supplier-form__compact-textarea"
                  defaultValue={property.documentFooterText}
                  disabled={!canManage}
                  maxLength={300}
                  name="footerText"
                  placeholder="Property-specific arrival guidance or a brief guest message"
                />
              </label>
              <label className="operational-document-settings__check">
                <input
                  defaultChecked={property.documentShowContact}
                  disabled={!canManage}
                  name="showPropertyContact"
                  type="checkbox"
                />
                Show the verified property email and phone on operational documents
              </label>
              {canManage ? (
                <button
                  className="ui-button ui-button--primary"
                  disabled={pendingPropertyId === property.id}
                  type="submit"
                >
                  {pendingPropertyId === property.id ? 'Saving…' : 'Save document profile'}
                </button>
              ) : null}
            </form>

            <article
              className="operational-document-preview"
              data-document-template={property.documentTemplate}
              data-document-theme={property.documentTheme}
            >
              <header>
                <div>
                  <small>Mandyal Travels · hotel operations</small>
                  <h3>{property.displayName}</h3>
                  {property.documentHeaderText ? <p>{property.documentHeaderText}</p> : null}
                </div>
                <strong>GUEST FOLIO</strong>
              </header>
              <dl>
                <div>
                  <dt>Booking reference</dt>
                  <dd>MT-SAMPLE-001</dd>
                </div>
                <div>
                  <dt>Stay dates</dt>
                  <dd>15 Sep – 17 Sep</dd>
                </div>
                <div>
                  <dt>Guest</dt>
                  <dd>Sample guest</dd>
                </div>
                <div>
                  <dt>Operational total</dt>
                  <dd>₹6,500</dd>
                </div>
              </dl>
              <p className="operational-document-preview__notice">
                Operational document · not a tax invoice
              </p>
              {property.documentShowContact ? (
                <p>
                  {property.contactEmail} · {property.contactPhone}
                </p>
              ) : null}
              {property.documentFooterText ? <footer>{property.documentFooterText}</footer> : null}
            </article>
          </section>
        ))}
      </div>
    </>
  );
}
