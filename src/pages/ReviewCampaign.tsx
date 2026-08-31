import { useMemo, useState } from "react";
import {
  Card, EmptyState, ErrorText, FieldLabel, Pill,
  ghostBtnCls, inputCls, primaryBtnCls,
} from "../components/ui";
import { useStore } from "../data/store";
import type { Campaign } from "../data/types";

interface Queue {
  sentPhones: string[];
  failed: { phone: string; reason: string }[];
}

export function ReviewCampaignPage() {
  const { campaigns, contacts, saveCampaign, sendReviewRequest } = useStore();
  const reviewCampaigns = useMemo(() => campaigns.filter((c) => c.kind === "review"), [campaigns]);
  const followUps = useMemo(
    () => campaigns.filter((c) => c.kind === "review_followup1" || c.kind === "review_followup2"),
    [campaigns]
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", template: "", webhookUrl: "" });
  const [formErr, setFormErr] = useState("");
  // Editing a follow up campaign.
  const [fuEditId, setFuEditId] = useState<string | null>(null);
  const [fuForm, setFuForm] = useState({ name: "", template: "", webhookUrl: "" });
  const [fuErr, setFuErr] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [queues, setQueues] = useState<Record<string, Queue>>({});
  const [sending, setSending] = useState(false);

  const openCreate = () => {
    setForm({ name: "", template: "", webhookUrl: "" });
    setEditId(null);
    setFormErr("");
    setFormOpen(true);
  };
  const openEdit = (c: Campaign) => {
    setForm({ name: c.name, template: c.template, webhookUrl: c.webhookUrl });
    setEditId(c.id);
    setFormErr("");
    setFormOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) return setFormErr("Enter a campaign name.");
    if (!form.template.trim()) return setFormErr("Enter the WhatsApp template message.");
    if (!form.webhookUrl.trim()) return setFormErr("Enter the webhook URL for this campaign.");
    saveCampaign({
      id: editId ?? undefined,
      kind: "review",
      name: form.name,
      template: form.template,
      webhookUrl: form.webhookUrl,
      offerText: null,
      expiryDays: null,
      status: "Active",
    });
    setFormOpen(false);
    setEditId(null);
  };

  const openCampaign = openId !== null ? reviewCampaigns.find((c) => c.id === openId) : null;

  if (openCampaign) {
    const q = queues[openCampaign.id];
    const sentSet = new Set(q ? q.sentPhones : []);
    const filtered = contacts.filter((ct) =>
      (ct.name + " " + ct.phone).toLowerCase().includes(pickerSearch.toLowerCase())
    );
    const selectable = filtered.filter((ct) => !sentSet.has(ct.phone));
    const allSelected = selectable.length > 0 && selectable.every((ct) => selected.includes(ct.id));
    const toggleAll = () =>
      setSelected(
        allSelected
          ? selected.filter((id) => !selectable.some((ct) => ct.id === id))
          : [...new Set([...selected, ...selectable.map((ct) => ct.id)])]
      );
    // Send each chosen contact through the Edge Function, which POSTs to this
    // campaign's webhook and records the send. Sent one at a time so partial
    // failures are reported and already sent contacts are not sent twice.
    const sendSelected = async () => {
      const chosen = contacts.filter(
        (c) => selected.includes(c.id) && !sentSet.has(c.phone)
      );
      if (!chosen.length) return;
      setSending(true);
      for (const c of chosen) {
        const { error } = await sendReviewRequest(c.id, null, openCampaign.id);
        setQueues((qs) => {
          const cur = qs[openCampaign.id] ?? { sentPhones: [], failed: [] };
          return error
            ? { ...qs, [openCampaign.id]: { ...cur, failed: [...cur.failed, { phone: c.phone, reason: error }] } }
            : { ...qs, [openCampaign.id]: { ...cur, sentPhones: [...cur.sentPhones, c.phone] } };
        });
      }
      setSending(false);
      setSelected([]);
      setPickerOpen(false);
      setPickerSearch("");
    };

    return (
      <>
        <button onClick={() => setOpenId(null)} className={`${ghostBtnCls} mb-3`}>
          ← Back to campaigns
        </button>
        <Card className="mb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="m-0 text-lg font-bold">{openCampaign.name}</p>
            <Pill text={openCampaign.status} tone={openCampaign.status === "Active" ? "green" : "amber"} />
          </div>
          <div className="grid gap-2.5 mt-3 text-[13px]">
            <div>
              <p className="m-0 text-xs text-faint">WhatsApp template</p>
              <p className="m-0 mt-0.5 text-sub leading-relaxed">{openCampaign.template}</p>
            </div>
            <div>
              <p className="m-0 text-xs text-faint">Webhook URL</p>
              <p className="m-0 mt-0.5 text-sub break-all">{openCampaign.webhookUrl}</p>
            </div>
          </div>
          <button onClick={() => openEdit(openCampaign)} className={`${ghostBtnCls} mt-3`}>
            Edit campaign
          </button>
        </Card>

        {formOpen && editId === openCampaign.id && (
          <CampaignForm form={form} setForm={setForm} err={formErr} onSave={save} onCancel={() => setFormOpen(false)} />
        )}

        <Card>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <p className="m-0 text-[15px] font-semibold">Send</p>
            <button
              onClick={() => { setPickerOpen(true); setSelected([]); setPickerSearch(""); }}
              className={primaryBtnCls}
            >
              + Add contacts to send
            </button>
          </div>
          <p className="m-0 mb-3 text-[12.5px] text-sub">
            Each contact you send is posted to this campaign's webhook, which fires the WhatsApp
            message. Contacts already sent are not sent again.
          </p>

          {q && (q.sentPhones.length > 0 || q.failed.length > 0) && (
            <div className="bg-accentsoft rounded-lg px-3.5 py-3 mb-3">
              <p className="m-0 text-[13px] font-bold text-accent">
                {q.sentPhones.length} sent to the webhook
                {q.failed.length ? ` · ${q.failed.length} could not send` : ""}
              </p>
              {q.failed.length > 0 && (
                <p className="m-0 mt-1 text-xs text-bad">
                  {q.failed[q.failed.length - 1].reason}
                </p>
              )}
            </div>
          )}

          {pickerOpen && (
            <div className="border border-accent rounded-lg p-3.5">
              <div className="flex flex-wrap gap-2.5 items-center mb-2.5">
                <input
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search contacts by name or phone"
                  className={`${inputCls} flex-1 min-w-[220px]`}
                />
                <label className="text-[13px] flex items-center gap-1.5 cursor-pointer font-semibold text-accent">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} /> Select all
                </label>
                <span className="text-xs text-sub">{selected.length} selected</span>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {filtered.length ? (
                  filtered.map((ct) => {
                    const already = sentSet.has(ct.phone);
                    return (
                      <label
                        key={ct.id}
                        className={`flex items-center gap-2.5 py-2 px-1 border-t border-line text-[13px] ${
                          already ? "opacity-45" : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={already}
                          checked={selected.includes(ct.id)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, ct.id]
                                : selected.filter((id) => id !== ct.id)
                            )
                          }
                        />
                        <span className="font-semibold flex-1">{ct.name}</span>
                        <span className="text-sub">{ct.phone}</span>
                        {already && <Pill text="Sent" tone="green" />}
                      </label>
                    );
                  })
                ) : (
                  <EmptyState>No contacts match that search.</EmptyState>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setPickerOpen(false); setSelected([]); }}
                  disabled={sending}
                  className={ghostBtnCls}
                >
                  Cancel
                </button>
                <button onClick={sendSelected} disabled={!selected.length || sending} className={primaryBtnCls}>
                  {sending ? "Sending…" : `Send now${selected.length ? ` (${selected.length})` : ""}`}
                </button>
              </div>
            </div>
          )}
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="mb-3">
        <button onClick={openCreate} className={primaryBtnCls}>
          + Create review campaign
        </button>
      </div>

      {formOpen && (
        <CampaignForm form={form} setForm={setForm} err={formErr} onSave={save} onCancel={() => setFormOpen(false)} />
      )}

      <p className="text-xs text-faint tracking-wide uppercase mb-2">Campaigns</p>
      <Card className="py-1 px-4">
        {reviewCampaigns.length ? (
          reviewCampaigns.map((c, i) => (
            <div
              key={c.id}
              onClick={() => setOpenId(c.id)}
              className={`flex items-start gap-3.5 py-3.5 cursor-pointer flex-wrap ${i ? "border-t border-line" : ""}`}
            >
              <div className="w-9 h-9 rounded-lg bg-accentsoft text-accent flex items-center justify-center shrink-0">
                ▷
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="m-0 text-[13px] font-semibold">{c.name}</p>
                <p className="m-0 mt-0.5 text-xs text-sub leading-relaxed">{c.template}</p>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Pill text={c.status} tone={c.status === "Active" ? "green" : "amber"} />
                <button onClick={() => openEdit(c)} className={`${ghostBtnCls} !px-2.5 !py-1 text-xs`}>
                  Edit
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState>
            No campaigns yet. Create your first review campaign to start asking diners for reviews.
          </EmptyState>
        )}
      </Card>

      <p className="text-xs text-faint tracking-wide uppercase mt-6 mb-2">Review follow ups</p>
      <p className="text-[12.5px] text-sub mb-2">
        If a diner does not give their name and number within 2 days, follow up 1 goes out. Follow
        up 2 goes out 2 days after that. Anyone who replies stops getting these.
      </p>
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))" }}>
        {followUps.map((c) =>
          fuEditId === c.id ? (
            <CampaignForm
              key={c.id}
              title={`Edit ${c.name}`}
              form={fuForm}
              setForm={setFuForm}
              err={fuErr}
              onSave={() => {
                if (!fuForm.name.trim()) return setFuErr("Enter a campaign name.");
                if (!fuForm.template.trim()) return setFuErr("Enter the WhatsApp template message.");
                if (!fuForm.webhookUrl.trim()) return setFuErr("Enter the webhook URL.");
                saveCampaign({
                  id: c.id,
                  kind: c.kind,
                  name: fuForm.name,
                  template: fuForm.template,
                  webhookUrl: fuForm.webhookUrl,
                  offerText: null,
                  expiryDays: null,
                  status: c.status,
                });
                setFuEditId(null);
              }}
              onCancel={() => setFuEditId(null)}
            />
          ) : (
            <Card key={c.id}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="m-0 text-sm font-bold">{c.name}</p>
                <Pill text={c.status} tone={c.status === "Active" ? "green" : "amber"} />
              </div>
              <p className="m-0 mt-1.5 text-[12.5px] text-sub leading-relaxed">{c.template}</p>
              <p className="m-0 mt-2 text-xs text-faint break-all">{c.webhookUrl}</p>
              <button
                onClick={() => {
                  setFuForm({ name: c.name, template: c.template, webhookUrl: c.webhookUrl });
                  setFuErr("");
                  setFuEditId(c.id);
                }}
                className={`${ghostBtnCls} mt-3 !py-1.5 text-xs`}
              >
                Edit
              </button>
            </Card>
          )
        )}
      </div>
    </>
  );
}

function CampaignForm({
  form,
  setForm,
  err,
  onSave,
  onCancel,
  title = "Review campaign",
}: {
  form: { name: string; template: string; webhookUrl: string };
  setForm: (f: { name: string; template: string; webhookUrl: string }) => void;
  err: string;
  onSave: () => void;
  onCancel: () => void;
  title?: string;
}) {
  return (
    <Card className="border-accent mb-4">
      <p className="m-0 mb-3 text-[15px] font-semibold text-accent">{title}</p>
      <div className="grid gap-3">
        <div>
          <FieldLabel>Campaign name</FieldLabel>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Table QR follow up"
            className={inputCls}
          />
        </div>
        <div>
          <FieldLabel>
            WhatsApp template ({form.template.length} characters, supports {"{name}"} and{" "}
            {"{Restaurant name}"})
          </FieldLabel>
          <textarea
            value={form.template}
            onChange={(e) => setForm({ ...form, template: e.target.value })}
            rows={3}
            className={`${inputCls} resize-y`}
          />
        </div>
        <div>
          <FieldLabel>Webhook URL (the GHL workflow that sends the WhatsApp message)</FieldLabel>
          <input
            value={form.webhookUrl}
            onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
            placeholder="https://your-ghl-workflow-url"
            className={inputCls}
          />
        </div>
        {err && <ErrorText>{err}</ErrorText>}
        <div className="flex gap-2">
          <button onClick={onSave} className={primaryBtnCls}>
            Save campaign
          </button>
          <button onClick={onCancel} className={ghostBtnCls}>
            Cancel
          </button>
        </div>
      </div>
    </Card>
  );
}
