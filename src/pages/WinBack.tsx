import { useMemo, useState } from "react";
import {
  Card, EmptyState, ErrorText, FieldLabel, Pill, SectionLabel,
  ghostBtnCls, inputCls, primaryBtnCls,
} from "../components/ui";
import { useStore } from "../data/store";
import { TODAY } from "../data/constants";
import type { Campaign, WinbackEntry, WinbackStage } from "../data/types";
import { daysBetween, fmtDate, plural } from "../lib/format";

const STAGE_RULES: Record<WinbackStage, string> = {
  1: "Fires after 14 days with no activity.",
  2: "Fires 14 days after Win back 1 if the diner stays away.",
  3: "Fires 14 days after Win back 2 if the diner stays away.",
  4: "Fires 60 days after Win back 3 if the diner stays away.",
};

export function WinBackPage() {
  const { campaigns, winbackEntries, contacts, markClaimed, saveCampaign } = useStore();
  const [openStage, setOpenStage] = useState<WinbackStage | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", template: "", webhookUrl: "", offerText: "", expiryDays: 5 });
  const [formErr, setFormErr] = useState("");

  const wbCampaigns = useMemo(
    () =>
      ([1, 2, 3, 4] as WinbackStage[])
        .map((stage) => ({
          stage,
          campaign: campaigns.find((c) => c.kind === `winback${stage}`),
        }))
        .filter((x): x is { stage: WinbackStage; campaign: Campaign } => !!x.campaign),
    [campaigns]
  );

  const contactName = (id: string) => contacts.find((c) => c.id === id)?.name ?? "Removed contact";

  const entriesFor = (stage: WinbackStage) => {
    const all = winbackEntries.filter((e) => e.stage === stage);
    const active = all.filter((e) => !e.claimedAt && !e.expiredAt && e.offerExpiresAt >= TODAY);
    return {
      active,
      waiting: active.filter((e) => e.sentAt),
      claimed: all.filter((e) => e.claimedAt),
      expired: all.filter((e) => e.expiredAt || (!e.claimedAt && e.offerExpiresAt < TODAY)),
    };
  };

  if (openStage !== null) {
    const found = wbCampaigns.find((x) => x.stage === openStage);
    if (!found) return null;
    const { campaign } = found;
    const lists = entriesFor(openStage);

    const entryRow = (e: WinbackEntry, i: number, kind: "active" | "waiting" | "claimed" | "expired") => {
      const daysLeft = Math.max(0, daysBetween(TODAY, e.offerExpiresAt));
      return (
        <div key={e.id} className={`flex items-center gap-3 py-2.5 flex-wrap ${i ? "border-t border-line" : ""}`}>
          <div className="flex-1 min-w-[160px]">
            <p className="m-0 text-[13px] font-semibold">{contactName(e.contactId)}</p>
            <p className="m-0 mt-0.5 text-xs text-sub">
              {kind === "claimed" && e.claimedAt && `Claimed on ${fmtDate(e.claimedAt)}.`}
              {kind === "expired" &&
                (e.voided
                  ? `Came back without the offer. Voided on ${fmtDate(e.expiredAt ?? e.offerExpiresAt)}.`
                  : `Expired on ${fmtDate(e.expiredAt ?? e.offerExpiresAt)}.`)}
              {(kind === "active" || kind === "waiting") &&
                `Offer sent ${e.sentAt ? fmtDate(e.sentAt) : "soon"}. ${plural(daysLeft, "day", "days")} left.`}
            </p>
          </div>
          {kind === "active" || kind === "waiting" ? (
            <>
              <Pill
                text={`${plural(daysLeft, "day", "days")} left`}
                tone={daysLeft <= 1 ? "red" : daysLeft <= 2 ? "amber" : "blue"}
              />
              <button
                onClick={() => markClaimed(e.id)}
                className="text-xs px-2.5 py-1 rounded-lg bg-good text-white font-semibold"
              >
                Mark as claimed
              </button>
            </>
          ) : kind === "claimed" ? (
            <Pill text="Claimed" tone="green" />
          ) : (
            <Pill text={e.voided ? "Voided" : "Expired"} tone={e.voided ? "amber" : "red"} />
          )}
        </div>
      );
    };

    const listCard = (
      title: string,
      note: string,
      items: WinbackEntry[],
      kind: "active" | "waiting" | "claimed" | "expired",
      empty: string
    ) => (
      <div>
        <SectionLabel>{title}</SectionLabel>
        <Card className="py-1 px-4">
          <p className="m-0 pt-2 text-xs text-faint">{note}</p>
          {items.length ? (
            items.map((e, i) => entryRow(e, i, kind))
          ) : (
            <EmptyState>{empty}</EmptyState>
          )}
        </Card>
      </div>
    );

    return (
      <>
        <button onClick={() => { setOpenStage(null); setEditOpen(false); }} className={`${ghostBtnCls} mb-3`}>
          ← Back to win back campaigns
        </button>
        <Card className="mb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="m-0 text-lg font-bold">{campaign.name}</p>
            <Pill text={campaign.status} tone={campaign.status === "Active" ? "green" : "amber"} />
          </div>
          <p className="m-0 mt-1 text-[13px] text-sub">{STAGE_RULES[openStage]}</p>
          <div className="grid gap-2.5 mt-3 text-[13px]">
            <div>
              <p className="m-0 text-xs text-faint">WhatsApp template</p>
              <p className="m-0 mt-0.5 text-sub leading-relaxed">{campaign.template}</p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <div>
                <p className="m-0 text-xs text-faint">Offer</p>
                <p className="m-0 mt-0.5 text-sub">{campaign.offerText}</p>
              </div>
              <div>
                <p className="m-0 text-xs text-faint">Offer valid for</p>
                <p className="m-0 mt-0.5 text-sub">{plural(campaign.expiryDays ?? 5, "day", "days")}</p>
              </div>
              <div>
                <p className="m-0 text-xs text-faint">Webhook URL</p>
                <p className="m-0 mt-0.5 text-sub break-all">{campaign.webhookUrl}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setForm({
                name: campaign.name,
                template: campaign.template,
                webhookUrl: campaign.webhookUrl,
                offerText: campaign.offerText ?? "",
                expiryDays: campaign.expiryDays ?? 5,
              });
              setFormErr("");
              setEditOpen(true);
            }}
            className={`${ghostBtnCls} mt-3`}
          >
            Edit campaign
          </button>
        </Card>

        {editOpen && (
          <Card className="border-accent mb-4">
            <p className="m-0 mb-3 text-[15px] font-semibold text-accent">Edit {campaign.name}</p>
            <div className="grid gap-3">
              <div>
                <FieldLabel>Campaign name</FieldLabel>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <FieldLabel>
                  WhatsApp template (supports {"{name}"}, {"{Restaurant name}"}, {"{offer}"} and {"{days_left}"})
                </FieldLabel>
                <textarea
                  value={form.template}
                  onChange={(e) => setForm({ ...form, template: e.target.value })}
                  rows={3}
                  className={`${inputCls} resize-y`}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Offer</FieldLabel>
                  <input
                    value={form.offerText}
                    onChange={(e) => setForm({ ...form, offerText: e.target.value })}
                    placeholder="a free dessert"
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Offer valid for (days)</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    value={form.expiryDays}
                    onChange={(e) => setForm({ ...form, expiryDays: Number(e.target.value) })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Webhook URL</FieldLabel>
                <input
                  value={form.webhookUrl}
                  onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                  className={inputCls}
                />
              </div>
              {formErr && <ErrorText>{formErr}</ErrorText>}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!form.name.trim()) return setFormErr("Enter a campaign name.");
                    if (!form.template.trim()) return setFormErr("Enter the WhatsApp template message.");
                    if (!form.webhookUrl.trim()) return setFormErr("Enter the webhook URL.");
                    saveCampaign({
                      id: campaign.id,
                      kind: campaign.kind,
                      name: form.name,
                      template: form.template,
                      webhookUrl: form.webhookUrl,
                      offerText: form.offerText || null,
                      expiryDays: form.expiryDays || 5,
                      status: campaign.status,
                    });
                    setEditOpen(false);
                  }}
                  className={primaryBtnCls}
                >
                  Save changes
                </button>
                <button onClick={() => setEditOpen(false)} className={ghostBtnCls}>
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        )}

        {listCard(
          "Currently in this campaign",
          "Diners holding an active offer from this stage.",
          lists.active,
          "active",
          "No one is in this stage right now."
        )}
        {listCard(
          "Waiting",
          "The message went out. The offer is still open and not yet claimed.",
          lists.waiting,
          "waiting",
          "No offers are waiting on a reply."
        )}
        {listCard(
          "Claimed offers",
          "Offers a staff member marked as claimed at the table or the till.",
          lists.claimed,
          "claimed",
          "No offers claimed from this stage yet."
        )}
        {listCard(
          "Expired offers",
          "Offers that lapsed, plus offers voided because the diner came back without claiming.",
          lists.expired,
          "expired",
          "No expired offers in this stage."
        )}
      </>
    );
  }

  return (
    <>
      <div className="bg-accentsoft text-accent rounded-lg px-3.5 py-2.5 mb-4 text-[12.5px] leading-relaxed">
        Four stages bring quiet customers back. A diner enters Win back 1 after 14 days with no
        activity. Any visit, scan or review resets them to Active. Offers claim only when your team
        taps Mark as claimed. If a diner comes back without claiming, the offer is voided and they
        leave the sequence.
      </div>
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))" }}>
        {wbCampaigns.map(({ stage, campaign }) => {
          const lists = entriesFor(stage);
          return (
            <Card key={stage} className="cursor-pointer hover:border-faint" >
              <div onClick={() => setOpenStage(stage)}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="m-0 text-sm font-bold">{campaign.name}</p>
                  <Pill text={campaign.status} tone={campaign.status === "Active" ? "green" : "amber"} />
                </div>
                <p className="m-0 mt-1 text-xs text-sub">{STAGE_RULES[stage]}</p>
                <p className="m-0 mt-2 text-[13px] text-sub">
                  Offer: {campaign.offerText}. Valid {plural(campaign.expiryDays ?? 5, "day", "days")}.
                </p>
                <div className="flex gap-2 flex-wrap mt-3">
                  <Pill text={`${lists.active.length} in campaign`} tone="blue" />
                  <Pill text={`${lists.claimed.length} claimed`} tone="green" />
                  <Pill text={`${lists.expired.length} expired`} tone="red" />
                </div>
                <p className="m-0 mt-2.5 text-xs text-accent font-semibold">Open campaign</p>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
