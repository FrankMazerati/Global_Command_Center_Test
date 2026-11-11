# Meta Company Baseline and Data Provenance

**Status:** Baseline specification only. Meta-specific audited financial history is not yet verified in this repository's seed data.

## Important distinction

The repository contains `supabase/seed/company_history_2020_2026.sql`, which generates a synthetic IntelliStack company-history dataset. It uses the lineage label `company_history_seed_v1` and generates customer companies, contacts, sales, sale items, subscriptions, and related lifecycle records. Those generated rows are demo data. They are not Meta, Inc. reported results and must never be relabelled as Meta actuals.

The presence of Meta-branded images or a Meta demo organization record does not prove that Meta's executive metadata, audited financial statements, quarterly results, subscriptions, purchases, sales, or add-ons have been loaded.

## Meta identity baseline

The canonical Meta entity should be represented as a company record in the existing organization/tenant/company model, not by creating an unrelated parallel tenant. Before adding or updating records, verify the actual schema and current identifiers for:

- Legal entity name and public brand name.
- Company website and public investor-relations source.
- Public company identifier (CIK) and exchange/ticker metadata, if supported.
- Headquarters and reporting currency.
- Fiscal year and quarter conventions.
- Company/tenant relationship and environment designation.
- CEO, CFO, CIO, CTO, and other executive contacts only when supported by an authoritative public source and a dated effective period.
- Source URL, retrieval date, effective date, and confidence for each fact.

Do not invent named executives, email addresses, phone numbers, private employee IDs, or internal company subscriptions.

## Financial history required

For each annual and quarterly reporting period from the requested start date through the latest available period, capture source-backed records where publicly disclosed:

1. Income statement: revenue, cost of revenue, gross profit, operating expenses, operating income, net income, and EPS where reported.
2. Balance sheet: cash and equivalents, marketable securities, receivables, property/equipment, total assets, liabilities, and equity where reported.
3. Cash flow: operating, investing, and financing cash flows, capital expenditures, and free cash flow only where the calculation basis is documented.
4. Segment reporting: reported segment revenue and operating income where disclosed.
5. Revenue breakdowns and operating metrics only where reported by the company.
6. Share repurchases, dividends, debt, acquisitions, and material capital allocation disclosures.
7. Guidance and outlook as a separate forward-looking data class, never mixed with actual results.

Use SEC filings (10-K, 10-Q, 8-K and XBRL company facts) and Meta Investor Relations as primary sources. Preserve filing accession number, filing date, report period, source URL, metric label, reported value, unit, currency, and whether the figure is reported, derived, restated, or estimated.

## Commercial relationship records

Meta's actual subscriptions, purchases, add-ons, invoices, sales to/from IntelliStack, and vendor/customer transactions are private contractual facts unless supplied by authorized records. Do not fabricate them from Meta's public revenue. Keep separate data classes:

- Public company financial disclosures.
- IntelliStack-to-Meta customer/vendor relationship records, if documented by executed agreements or authorized exports.
- Synthetic demonstration transactions, explicitly labelled demo.
- Unavailable / not provided fields.

No public-company revenue number should be inserted into IntelliStack's customer invoice or subscription tables.

## Import and reconciliation controls

- Use stable natural keys: legal entity + fiscal period + metric + source filing/accession.
- Make imports idempotent and preserve prior source versions.
- Store raw source references and normalized metric records separately.
- Retain units and currency; do not sum USD, EUR, and other currencies without an explicit conversion rate, source, and conversion date.
- Mark restatements and amendments; do not silently overwrite original filings.
- Validate quarter/year consistency and compare annual totals with quarterly sums where compatible.
- Keep actual, derived, estimated, and synthetic values visibly distinct in every UI and export.
- Record import actor, timestamp, source, parser version, and validation results.

## Completion criteria

The Meta baseline is not complete until:
- the canonical Meta company/tenant mapping is verified;
- public executive metadata is sourced and dated;
- every included annual/quarterly figure links to an authoritative filing/source;
- the data model preserves period, unit, currency, and lineage;
- all private commercial relationship fields are sourced from authorized documents or remain explicitly unavailable;
- reconciliation and duplicate-import tests pass;
- tenant isolation and access tests pass.

Until then, the UI must display **Meta company profile: baseline pending source verification** rather than a fabricated complete financial history.
