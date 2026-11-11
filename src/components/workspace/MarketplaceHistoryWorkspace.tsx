import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, CreditCard, FileText, Search, Users } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type Account = {
  id: string;
  account_number: string;
  customer_company_id: string;
  customer_since: string;
  account_status: string;
  industry: string | null;
  company_size: string | null;
};
type Company = {
  id: string;
  display_name: string;
  legal_name: string;
  headquarters_city: string | null;
  headquarters_region: string | null;
};
type Contact = {
  id: string;
  customer_account_id: string;
  first_name: string;
  last_name: string;
  contact_email: string;
  job_title: string;
  department: string | null;
  contact_role: string;
};
type Sale = {
  id: string;
  sale_number: string;
  customer_account_id: string;
  sale_date: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
};
type Invoice = {
  id: string;
  invoice_number: string;
  customer_account_id: string;
  issued_at: string;
  due_at: string;
  invoice_status: string;
  total: number;
  amount_paid: number;
  balance_due: number;
};
type Subscription = {
  id: string;
  subscription_number: string;
  customer_account_id: string;
  plan_key: string;
  billing_cycle: string;
  monthly_amount: number;
  status: string;
  starts_at: string;
  next_billing_at: string | null;
};
const money = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);
const dateLabel = (value: string | null | undefined) =>
  value ? new Date(value + (value.length === 10 ? "T00:00:00" : "")).toLocaleDateString() : "—";
const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function MarketplaceHistoryWorkspace({ title, pageSlug }: { title: string; pageSlug: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customerCount, setCustomerCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [contactCount, setContactCount] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [activeSubscriptionCount, setActiveSubscriptionCount] = useState(0);
  const [overdueInvoiceCount, setOverdueInvoiceCount] = useState(0);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase is not configured for this workspace.");
      setLoading(false);
      return () => { active = false; };
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      const revenuePages = await Promise.all(
        Array.from({ length: 5 }, (_, page) =>
          supabase.from("marketplace_sales")
            .select("id,sale_number,customer_account_id,sale_date,status,payment_status,total_amount,currency")
            .order("sale_date", { ascending: false })
            .range(page * 1000, page * 1000 + 999)
        )
      );
      const [accountResult, companyPages, saleRecentResult, invoiceResult, subscriptionResult,
        accountCountResult, salesCountResult, contactCountResult, subscriptionCountResult,
        activeSubscriptionResult, overdueInvoiceResult] = await Promise.all([
        supabase.from("marketplace_customer_accounts")
          .select("id,account_number,customer_company_id,customer_since,account_status,industry,company_size")
          .order("customer_since", { ascending: false }).limit(1000),
        Promise.all([0, 1].map((page) =>
          supabase.from("marketplace_companies")
            .select("id,display_name,legal_name,headquarters_city,headquarters_region")
            .range(page * 1000, page * 1000 + 999)
        )),
        supabase.from("marketplace_sales")
          .select("id,sale_number,customer_account_id,sale_date,status,payment_status,total_amount,currency")
          .order("sale_date", { ascending: false }).limit(150),
        supabase.from("company_invoices")
          .select("id,invoice_number,customer_account_id,issued_at,due_at,invoice_status,total,amount_paid,balance_due")
          .order("issued_at", { ascending: false }).limit(500),
        supabase.from("marketplace_customer_subscriptions")
          .select("id,subscription_number,customer_account_id,plan_key,billing_cycle,monthly_amount,status,starts_at,next_billing_at")
          .order("starts_at", { ascending: false }).limit(200),
        supabase.from("marketplace_customer_accounts").select("id", { count: "exact", head: true }),
        supabase.from("marketplace_sales").select("id", { count: "exact", head: true }),
        supabase.from("marketplace_customer_contacts").select("id", { count: "exact", head: true }),
        supabase.from("marketplace_customer_subscriptions").select("id", { count: "exact", head: true }),
        supabase.from("marketplace_customer_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("company_invoices").select("id", { count: "exact", head: true }).eq("invoice_status", "overdue"),
      ]);
      if (!active) return;
      const firstError = [
        ...revenuePages, accountResult, ...companyPages, saleRecentResult, invoiceResult,
        subscriptionResult, accountCountResult, salesCountResult, contactCountResult,
        subscriptionCountResult, activeSubscriptionResult, overdueInvoiceResult,
      ].find((result) => result.error)?.error;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }
      const revenueRows = revenuePages.flatMap((result) => result.data ?? []) as Sale[];
      setAccounts((accountResult.data ?? []) as Account[]);
      setCompanies(companyPages.flatMap((result) => result.data ?? []) as Company[]);
      setAllSales(revenueRows);
      setSales((saleRecentResult.data ?? []) as Sale[]);
      setInvoices((invoiceResult.data ?? []) as Invoice[]);
      setSubscriptions((subscriptionResult.data ?? []) as Subscription[]);
      setCustomerCount(accountCountResult.count ?? 0);
      setSalesCount(salesCountResult.count ?? 0);
      setContactCount(contactCountResult.count ?? 0);
      setSubscriptionCount(subscriptionCountResult.count ?? 0);
      setActiveSubscriptionCount(activeSubscriptionResult.count ?? 0);
      setOverdueInvoiceCount(overdueInvoiceResult.count ?? 0);
      setLoading(false);
    };

    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    if (!supabase || !selectedAccountId) {
      setContacts([]);
      return () => { active = false; };
    }
    void supabase.from("marketplace_customer_contacts")
      .select("id,customer_account_id,first_name,last_name,contact_email,job_title,department,contact_role")
      .eq("customer_account_id", selectedAccountId)
      .order("is_primary", { ascending: false })
      .then(({ data, error: contactError }) => {
        if (!active) return;
        if (contactError) {
          setError(contactError.message);
          return;
        }
        setContacts((data ?? []) as Contact[]);
      });
    return () => { active = false; };
  }, [selectedAccountId]);

  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company])), [companies]);
  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const selectedAccount = accountById.get(selectedAccountId);
  const selectedCompany = selectedAccount ? companyById.get(selectedAccount.customer_company_id) : undefined;
  const selectedContacts = contacts.filter((contact) => contact.customer_account_id === selectedAccountId);
  const totalRevenue = allSales
    .filter((sale) => sale.status === "closed_won" || sale.status === "active")
    .reduce((total, sale) => total + Number(sale.total_amount || 0), 0);
  const activeSubscriptions = activeSubscriptionCount;
  const overdueInvoices = overdueInvoiceCount;

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter((sale) => {
      const account = accountById.get(sale.customer_account_id);
      const company = account ? companyById.get(account.customer_company_id) : undefined;
      return [sale.sale_number, sale.payment_status, sale.status, account?.account_number, company?.display_name]
        .some((value) => String(value ?? "").toLowerCase().includes(term));
    });
  }, [sales, search, accountById, companyById]);

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter((account) => {
      const company = companyById.get(account.customer_company_id);
      return [account.account_number, account.industry, account.account_status, company?.display_name]
        .some((value) => String(value ?? "").toLowerCase().includes(term));
    });
  }, [accounts, search, companyById]);

  const isInvoiceView = pageSlug === "billing-and-renewals" || pageSlug === "transactions-and-payments";
  const isSubscriptionView = pageSlug === "subscription-management" || pageSlug === "seats-and-licensing";
  const isAccountView = pageSlug === "tenant-purchases";
  const isOverview = pageSlug === "marketplace-overview";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">IntelliSphere Marketplace · Company history</div>
            <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">Customer accounts, purchases, subscriptions, renewals, invoices, and executive contacts across the company's operating history.</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm">
            <span className="block text-xs text-slate-300">Company history begins</span>
            <b>February 10, 2020</b>
          </div>
        </div>
      </section>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Unable to load marketplace history: {error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Customer accounts", value: customerCount.toLocaleString(), icon: Building2 },
          { label: "Recorded purchases", value: salesCount.toLocaleString(), icon: CreditCard },
          { label: "Marketplace revenue", value: money(totalRevenue), icon: FileText },
          { label: "Active subscriptions", value: activeSubscriptions.toLocaleString(), icon: CalendarDays },
        ].map((metric) => {
          const Icon = metric.icon;
          return <div key={metric.label} className="rounded-xl border bg-card p-4 shadow-card">
            <Icon className="mb-3 size-5 text-primary" />
            <span className="text-xs text-muted-foreground">{metric.label}</span>
            <b className="mt-1 block text-2xl">{loading ? "—" : metric.value}</b>
          </div>;
        })}
      </div>

      {isOverview && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-4"><span className="text-xs text-muted-foreground">Customer contacts</span><b className="mt-1 block text-2xl">{loading ? "—" : contactCount.toLocaleString()}</b><p className="mt-1 text-xs text-muted-foreground">Includes executive, finance, technology, and HR contacts.</p></div>
          <div className="rounded-xl border bg-card p-4"><span className="text-xs text-muted-foreground">Invoices requiring attention</span><b className="mt-1 block text-2xl">{loading ? "—" : overdueInvoices.toLocaleString()}</b><p className="mt-1 text-xs text-muted-foreground">Overdue invoices in the latest 500 loaded records.</p></div>
          <div className="rounded-xl border bg-card p-4"><span className="text-xs text-muted-foreground">Subscriptions in history</span><b className="mt-1 block text-2xl">{loading ? "—" : subscriptionCount.toLocaleString()}</b><p className="mt-1 text-xs text-muted-foreground">Monthly and annual customer agreements.</p></div>
        </div>
      )}

      <section className="rounded-xl border bg-card p-4 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{isAccountView ? "Customer company accounts" : isInvoiceView ? "Invoices and payment history" : isSubscriptionView ? "Customer subscriptions" : "Sales and purchase history"}</h3>
            <p className="text-sm text-muted-foreground">{isAccountView ? "Open a company to review its CEO, CFO, CIO, and HR contacts." : "Search historical marketplace records and open a customer account for executive details."}</p>
          </div>
          <div className="flex min-w-[220px] items-center gap-2 rounded-md border px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input className="w-full bg-transparent text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company or record…" />
          </div>
        </div>

        {loading ? <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">Loading company history from Supabase…</div> :
          isAccountView ? (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Company</th><th className="px-3 py-3">Account</th><th className="px-3 py-3">Industry</th><th className="px-3 py-3">Company size</th><th className="px-3 py-3">Customer since</th><th className="px-3 py-3">Status</th></tr></thead>
                <tbody>{filteredAccounts.slice(0,200).map((account) => {
                  const company = companyById.get(account.customer_company_id);
                  return <tr key={account.id} className="cursor-pointer border-t hover:bg-accent/40" onClick={() => setSelectedAccountId(account.id)}>
                    <td className="px-3 py-3 font-medium">{company?.display_name ?? "Company record"}</td><td className="px-3 py-3">{account.account_number}</td><td className="px-3 py-3">{account.industry ?? "—"}</td><td className="px-3 py-3">{account.company_size ?? "—"}</td><td className="px-3 py-3">{dateLabel(account.customer_since)}</td><td className="px-3 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs">{titleCase(account.account_status)}</span></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          ) : isInvoiceView ? (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Invoice</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Issued</th><th className="px-3 py-3">Due</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Paid</th><th className="px-3 py-3">Balance</th><th className="px-3 py-3">Status</th></tr></thead>
                <tbody>{invoices.filter((invoice) => {
                  const account = accountById.get(invoice.customer_account_id);
                  const company = account ? companyById.get(account.customer_company_id) : undefined;
                  return [invoice.invoice_number, company?.display_name, invoice.invoice_status].some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase()));
                }).slice(0,200).map((invoice) => {
                  const account = accountById.get(invoice.customer_account_id);
                  const company = account ? companyById.get(account.customer_company_id) : undefined;
                  return <tr key={invoice.id} className="border-t"><td className="px-3 py-3 font-medium">{invoice.invoice_number}</td><td className="px-3 py-3">{company?.display_name ?? "—"}</td><td className="px-3 py-3">{dateLabel(invoice.issued_at)}</td><td className="px-3 py-3">{dateLabel(invoice.due_at)}</td><td className="px-3 py-3">{money(Number(invoice.total))}</td><td className="px-3 py-3">{money(Number(invoice.amount_paid))}</td><td className="px-3 py-3">{money(Number(invoice.balance_due))}</td><td className="px-3 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs">{titleCase(invoice.invoice_status)}</span></td></tr>;
                })}</tbody>
              </table>
            </div>
          ) : isSubscriptionView ? (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Subscription</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">Cycle</th><th className="px-3 py-3">Monthly value</th><th className="px-3 py-3">Started</th><th className="px-3 py-3">Next billing</th><th className="px-3 py-3">Status</th></tr></thead>
                <tbody>{subscriptions.filter((subscription) => {
                  const account = accountById.get(subscription.customer_account_id);
                  const company = account ? companyById.get(account.customer_company_id) : undefined;
                  return [subscription.subscription_number, subscription.plan_key, subscription.status, company?.display_name].some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase()));
                }).slice(0,200).map((subscription) => {
                  const account = accountById.get(subscription.customer_account_id);
                  const company = account ? companyById.get(account.customer_company_id) : undefined;
                  return <tr key={subscription.id} className="border-t"><td className="px-3 py-3 font-medium">{subscription.subscription_number}</td><td className="px-3 py-3">{company?.display_name ?? "—"}</td><td className="px-3 py-3">{titleCase(subscription.plan_key)}</td><td className="px-3 py-3">{titleCase(subscription.billing_cycle)}</td><td className="px-3 py-3">{money(Number(subscription.monthly_amount))}</td><td className="px-3 py-3">{dateLabel(subscription.starts_at)}</td><td className="px-3 py-3">{dateLabel(subscription.next_billing_at)}</td><td className="px-3 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs">{titleCase(subscription.status)}</span></td></tr>;
                })}</tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Sale number</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Sale status</th><th className="px-3 py-3">Payment</th></tr></thead>
                <tbody>{filteredSales.slice(0,200).map((sale) => {
                  const account = accountById.get(sale.customer_account_id);
                  const company = account ? companyById.get(account.customer_company_id) : undefined;
                  return <tr key={sale.id} className="border-t hover:bg-accent/40">
                    <td className="px-3 py-3 font-medium">{sale.sale_number}</td>
                    <td className="px-3 py-3"><button type="button" className="text-left font-medium text-primary hover:underline" onClick={() => setSelectedAccountId(sale.customer_account_id)}>{company?.display_name ?? account?.account_number ?? "Customer"}</button></td>
                    <td className="px-3 py-3">{dateLabel(sale.sale_date)}</td><td className="px-3 py-3">{money(Number(sale.total_amount),sale.currency)}</td><td className="px-3 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs">{titleCase(sale.status)}</span></td><td className="px-3 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs">{titleCase(sale.payment_status)}</span></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
      </section>

      {selectedAccount && selectedCompany && (
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div><div className="text-xs font-semibold uppercase tracking-wider text-primary">Customer account · {selectedAccount.account_number}</div><h3 className="text-xl font-semibold">{selectedCompany.display_name}</h3><p className="text-sm text-muted-foreground">{selectedCompany.legal_name} · {selectedCompany.headquarters_city ?? "Location not listed"}{selectedCompany.headquarters_region ? ", "+selectedCompany.headquarters_region : ""}</p></div>
            <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-accent" onClick={() => setSelectedAccountId("")}>Close details</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3"><span className="text-xs text-muted-foreground">Industry</span><b className="mt-1 block">{selectedAccount.industry ?? "—"}</b></div>
            <div className="rounded-lg border p-3"><span className="text-xs text-muted-foreground">Company size</span><b className="mt-1 block">{selectedAccount.company_size ?? "—"}</b></div>
            <div className="rounded-lg border p-3"><span className="text-xs text-muted-foreground">Customer since</span><b className="mt-1 block">{dateLabel(selectedAccount.customer_since)}</b></div>
          </div>
          <div className="mt-4 flex items-center gap-2"><Users className="size-4 text-primary" /><h4 className="font-semibold">Executive and business contacts</h4></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {selectedContacts.map((contact) => <div key={contact.id} className="rounded-lg border p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">{titleCase(contact.contact_role)}</div>
              <b className="mt-1 block">{contact.first_name} {contact.last_name}</b>
              <div className="text-sm text-muted-foreground">{contact.job_title}</div>
              <div className="mt-2 break-all text-xs">{contact.contact_email}</div>
            </div>)}
            {!selectedContacts.length && <p className="text-sm text-muted-foreground">No contacts recorded for this account.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
