# IntelliPay — Platform Architecture and Launch Plan

**Product owner:** IntelliStack Systems, Incorporated  
**Product:** IntelliPay  
**Status:** Architecture / partner diligence; no live money movement or card issuance enabled.

## 1. Product position

IntelliPay is the financial services and payments product family within the IntelliStack ecosystem. It must support both individual consumers and organizations without treating every user as an employee of a company.

IntelliPay is not a bank. In its first commercial release, regulated financial functions should be supplied by contracted, approved payment, banking, and card-issuing partners. IntelliStack owns the customer experience, product rules, integration layer, support workflows, reporting, and (where contractually permitted) program management responsibilities.

## 2. Customer segments and product lines

- **Consumer:** personal checkout, saved payment methods (provider tokens only), receipts, refunds, subscriptions, and later partner-issued debit/prepaid card.
- **Business / merchant:** payment acceptance, hosted checkout, invoices, subscriptions, refunds, reconciliation, reporting, and later employee spend controls.
- **IntelliStaff:** approved payroll/earned-wage or expense disbursement integrations; never represent a payout as completed until the provider confirms settlement.
- **IntelliHire:** candidate fees only where lawful and appropriate; employer subscription billing; approved reimbursements and hiring-related payments. Do not charge job applicants for access to employment opportunities without legal review.
- **IntelliWork:** contractor invoices, approved work orders, milestone billing, and partner-enabled payouts.
- **IntelliStack internal:** subscriptions for the IntelliSphere suite, marketplace purchases, licensing, and enterprise billing.

## 3. Recommended product sequence

### Release 1 — Payment orchestration and merchant billing
1. Integrate one payment service provider for card acceptance and hosted checkout.
2. Implement payment intents, provider references, signed webhook ingestion, refunds, disputes, and reconciliation.
3. Reuse existing marketplace orders, subscriptions, company invoices, and customer accounts where they fit; do not create parallel invoice/catalog systems.
4. Build a provider-neutral adapter so a second processor can be added without rewriting product logic.
5. Launch only after legal review of merchant-of-record, tax, refunds, chargebacks, and data handling responsibilities.

### Release 2 — Business and workforce disbursements
1. Select a licensed payout provider and bank partner.
2. Add recipient onboarding, identity/business verification, sanctions screening, payout eligibility, approval gates, and return/reversal handling.
3. Link IntelliStaff, IntelliHire, and IntelliWork to approved payment requests.
4. Keep employer/client funds, platform revenue, and individual balances clearly segregated in records and partner accounts.

### Release 3 — IntelliPay branded cards
1. Define initial card use case: business expense, contractor payout, or consumer debit/prepaid. Do not attempt all three in the first launch.
2. Obtain proposals from program-managed issuing providers (for example Stripe Issuing, Lithic Program Managed, and Marqeta Managed by Marqeta).
3. Select an issuing bank/BIN sponsor, card processor/program manager, network, KYC/KYB vendor, fraud/AML stack, card manufacturer/fulfillment, and dispute support model.
4. Negotiate cardholder funds custody, settlement, reserve requirements, loss allocation, fraud liability, chargebacks, customer support, program termination and migration rights.
5. Complete legal review, bank due diligence, network approvals, card artwork approval, PCI scope assessment, operational readiness and partner certification.
6. Start with virtual cards and a limited approved pilot; add physical cards and mobile wallets after authorization.

### Release 4 — Advanced financial products
Credit, lending, stored value, deposit-like accounts, international remittance, and proprietary payment network ambitions are separate regulated workstreams. They require separate partner, legal, capital, and licensing decisions. They are not implied by a successful card program.

## 4. Target architecture

- **Identity and party model:** consumer profile, business/organization, workforce relationship, authorized representatives, beneficial owners, and delegated access are separate concepts.
- **IntelliPay API:** versioned server-side API; no provider secret keys or service-role keys in browser/mobile clients.
- **Provider adapter layer:** normalized create/confirm/capture/refund/void/payout operations; provider-specific IDs retained for reconciliation.
- **Payment state machine:** created → requires_action/processing → authorized → captured/settled, or failed/cancelled; refunds and disputes are independent linked lifecycles.
- **Webhook inbox:** verify provider signatures, persist raw event metadata securely, deduplicate provider event IDs, process asynchronously, and retain failures for replay.
- **Idempotency:** require idempotency keys for money-moving requests; bind keys to actor, scope, request hash, and expiry; same key with different payload is rejected.
- **Double-entry subledger:** integer minor units (cents), ISO currency, immutable posted entries, balanced debits and credits per transaction, explicit pending/available/reserved/settlement accounts, reversal entries rather than edits. The ledger is not itself a bank account or evidence that funds are held by IntelliStack.
- **Reconciliation:** compare provider settlement reports, bank settlement statements, fees, refunds, disputes, and ledger postings; unmatched items become review cases.
- **Risk and compliance:** KYC/KYB, beneficial ownership, sanctions, transaction monitoring, velocity controls, fraud review, complaints, error resolution, record retention, vendor oversight and incident response, allocated with the bank/provider in written contracts.
- **Card control plane:** cardholder, program, card token/reference, status, freeze/unfreeze, spend limits, merchant/category controls, authorization decisions, clearing, settlement, disputes and replacement lifecycle. Do not store PAN/CVV/PIN in IntelliStack databases.
- **Security:** tenant and customer isolation; least privilege; step-up authentication for sensitive actions; immutable audit trail; encryption; secrets vault; PCI scope minimization; operational alerts and dual control for high-risk administration.

## 5. Data model domains

Use existing platform tables where appropriate:
- Existing commercial records: `marketplace_orders`, `marketplace_order_items`, `marketplace_customer_accounts`, `marketplace_customer_subscriptions`, `company_invoices`, and marketplace sales/subscription history.
- Existing identity and tenancy: `profiles`, `organizations`, `tenants`, and workforce records.

Add new payment-specific records only after provider and merchant-of-record decisions:
- provider connections and provider account mappings;
- payment intents and provider transaction references;
- webhook inbox and delivery/processing attempts;
- immutable double-entry ledger accounts, transactions and entries;
- refund and dispute cases;
- payout requests, recipients, approvals, provider payout references and returns;
- card programs, cardholder enrollment, tokenized card references, authorization events, clearing and settlement records;
- reconciliation batches, exceptions and resolutions.

Never use floating-point for monetary amounts. Prefer integer minor units plus currency. Never store raw card numbers or security codes.

## 6. Commercial and technical decision gates

Before accepting live payments, establish who is the merchant of record, who contracts with the customer, who bears refunds/chargebacks, where settlement funds land, who handles tax, and which party is responsible for KYC/AML and consumer complaints.

Before card issuance, get written proposals and confirm:
- supported consumer and commercial card types;
- minimum monthly commitments, implementation and program fees;
- card manufacturing, personalization, shipping and replacement costs;
- per-card, per-authorization, per-clearing, ATM, tokenization and wallet costs;
- interchange sharing and network assessments;
- reserve, prefunding, collateral and settlement timing;
- fraud/chargeback liability and termination/migration terms;
- KYC/KYB and ongoing monitoring responsibilities;
- geographic coverage and program restrictions.

## 7. Planning cost ranges (USD; estimates, not vendor quotes)

These are budgeting envelopes, not guaranteed market prices. Actual commercial pricing is quote-based and depends on geography, volume, card type, program risk, and who performs compliance.

| Workstream | Early planning envelope |
|---|---:|
| Legal entity, fintech regulatory counsel, initial product/compliance assessment | $10,000–$40,000 |
| Payment provider integration and hosted checkout (software build) | $5,000–$25,000 |
| Merchant onboarding, fraud controls, disputes, reconciliation, support readiness | $10,000–$50,000 |
| Program-managed card discovery, diligence and integration | $25,000–$100,000+ |
| Card art, first card batch, fulfillment and launch marketing | $5,000–$30,000+ |
| Ongoing program operations, compliance, support and vendor minimums | $5,000–$25,000+/month |

A lean partner-led first card launch can therefore require a planning budget around **$50,000–$150,000+**, excluding major prefunding/reserves, unusually high legal costs, lending features, and the cost of building the full consumer/business platform. A larger or directly bank-sponsored program can cost substantially more. Do not treat this as a quote.

Physical plastic commonly adds manufacturing and shipping costs per card; card program providers also charge platform, processing, network, bank, verification and operational fees. Obtain a written pricing schedule before selecting a partner.

## 8. Revenue model candidates

- merchant payment processing margin, if the provider contract and legal model permit;
- SaaS subscriptions for business billing, reconciliation and workforce payments;
- per-seat fees for enterprise spend management;
- card program/service fees where permitted and transparently disclosed;
- marketplace and IntelliSphere subscription billing;
- optional premium reporting and integrations.

Interchange should be treated as a possible revenue share, not a guaranteed profit center. Economics depend on card type, regulated debit interchange limits, bank/program splits, transaction mix and vendor fees.

## 9. Launch plan and milestones

1. Confirm initial customer and use case; choose merchant-of-record model.
2. Interview payment providers and obtain written pricing/compliance responsibility matrices.
3. Build hosted checkout, billing, webhook reliability, ledger and reconciliation.
4. Run internal test transactions only in provider sandbox; clearly label all test activity and never present it as customer money.
5. Complete security, legal, privacy, accessibility, tax and support reviews.
6. Launch a narrow real-payment pilot through an approved provider.
7. Measure authorization rate, payment completion, fraud, refunds, chargebacks, settlement breaks, support tickets, and contribution margin.
8. Only then sign and launch the card program.

## 10. Current status

- IntelliPay product architecture documented.
- Existing marketplace billing and invoice infrastructure identified for reuse.
- No IntelliPay-specific card or money-movement tables were found in the current public schema inventory.
- No payment processor, issuing bank, card program manager, network sponsorship, or production merchant account has been selected or connected.
- No real payment processing, stored-value wallet, card issuance, or fund custody is enabled by this specification.

## 11. Illinois-specific regulatory gate

Because the initial operating company is expected to be based in Illinois, obtain Illinois fintech regulatory counsel before marketing IntelliPay as a wallet, stored-value product, money transfer service, or payment instrument. Illinois IDFPR states that money transmitters are licensed under the Transmitters of Money Act, and its published guidance describes stored-value/prepaid products within the Act. The Uniform Money Transmission Modernization Act also restricts engaging in, advertising, soliciting, or holding out as providing money transmission without a license unless an exemption applies. A properly structured authorized-delegate or bank/processor partner model may change the analysis, but it is not an automatic exemption; the actual contracts, flow of funds, customer promises, and activities determine the result. Have counsel obtain a written scope opinion before public claims or live fund flows. Sources: Illinois IDFPR, [Money Transmitters](https://idfpr.illinois.gov/about/brochures/dfibrochures/currency-exchange-section.html); [Illinois Uniform Money Transmission Modernization Act](https://law.justia.com/codes/illinois/chapter-205/act-205-ilcs-658/article-v/).
