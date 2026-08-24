import { useState } from "react";
import {
  Card, EmptyState, ErrorText, FieldLabel, Pill, Stars,
  ghostBtnCls, inputCls, primaryBtnCls,
} from "../components/ui";
import { QrCanvas, downloadQrPng, staffReviewLink } from "../components/QrCode";
import { useReviewsInRange, useStore } from "../data/store";
import type { StaffMember } from "../data/types";
import { fmtDate, plural } from "../lib/format";

function StaffForm({
  initial,
  onSave,
  onCancel,
  title,
}: {
  initial: { firstName: string; surname: string; webhookUrl: string };
  onSave: (v: { firstName: string; surname: string; webhookUrl: string }) => void;
  onCancel: () => void;
  title: string;
}) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState("");
  return (
    <Card className="border-accent mb-4">
      <p className="m-0 mb-3 text-[15px] font-semibold text-accent">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>First name</FieldLabel>
          <input
            value={v.firstName}
            onChange={(e) => { setV({ ...v, firstName: e.target.value }); setErr(""); }}
            className={inputCls}
          />
        </div>
        <div>
          <FieldLabel>Surname</FieldLabel>
          <input
            value={v.surname}
            onChange={(e) => { setV({ ...v, surname: e.target.value }); setErr(""); }}
            className={inputCls}
          />
        </div>
        <div>
          <FieldLabel>Job category</FieldLabel>
          <select className={inputCls} defaultValue="Waiter">
            <option value="Waiter">Waiter</option>
          </select>
        </div>
        <div>
          <FieldLabel>Webhook URL</FieldLabel>
          <input
            value={v.webhookUrl}
            onChange={(e) => { setV({ ...v, webhookUrl: e.target.value }); setErr(""); }}
            placeholder="https://your-ghl-workflow-url"
            className={inputCls}
          />
          <p className="text-xs text-faint mt-1">
            The GHL workflow that messages this staff member's diners with their unique review link.
          </p>
        </div>
      </div>
      {err && <ErrorText>{err}</ErrorText>}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => {
            if (!v.firstName.trim()) return setErr("Enter a first name.");
            if (!v.surname.trim()) return setErr("Enter a surname.");
            if (!v.webhookUrl.trim()) return setErr("Enter the webhook URL for this staff member.");
            onSave(v);
          }}
          className={primaryBtnCls}
        >
          Save staff member
        </button>
        <button onClick={onCancel} className={ghostBtnCls}>
          Cancel
        </button>
      </div>
    </Card>
  );
}

export function StaffPage() {
  const { staff, addStaff, editStaff } = useStore();
  const inRange = useReviewsInRange();
  const [openStaffId, setOpenStaffId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState("");

  const ratingsFor = (id: string) => inRange.filter((r) => r.staffId === id);
  const avgFor = (id: string) => {
    const mine = ratingsFor(id);
    return mine.length ? mine.reduce((a, r) => a + r.staffStars, 0) / mine.length : 0;
  };

  const copyLink = async (s: StaffMember) => {
    const link = staffReviewLink(s.qrSlug);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.prompt("Copy this link", link);
    }
  };

  const open = openStaffId !== null ? staff.find((s) => s.id === openStaffId) : null;

  if (open) {
    const mine = ratingsFor(open.id);
    const myAvg = avgFor(open.id);
    return (
      <>
        <button onClick={() => setOpenStaffId(null)} className={`${ghostBtnCls} mb-3`}>
          ← Back to staff
        </button>
        <Card className="mb-4 flex items-center gap-4 flex-wrap">
          <QrCanvas value={staffReviewLink(open.qrSlug)} size={72} />
          <div className="flex-1 min-w-[180px]">
            <p className="m-0 text-lg font-bold">
              {open.firstName} {open.surname}
            </p>
            <p className="m-0 mt-0.5 text-[13px] text-sub">
              {open.category} · {plural(mine.length, "rating", "ratings")} in range
              {mine.length ? ` · average ${myAvg.toFixed(1)}★` : ""}
            </p>
            <p className="m-0 mt-1 text-xs text-faint break-all">{staffReviewLink(open.qrSlug)}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => copyLink(open)} className={ghostBtnCls}>
              {copiedId === open.id ? "Copied" : "Copy link"}
            </button>
            <button
              onClick={() => downloadQrPng(staffReviewLink(open.qrSlug), `${open.firstName}-${open.surname}-qr.png`)}
              className={ghostBtnCls}
            >
              Download QR
            </button>
          </div>
        </Card>
        <p className="text-xs text-faint tracking-wide uppercase mb-2">
          Comments about {open.firstName} in range
        </p>
        <Card className="py-1 px-4">
          {mine.length ? (
            mine.slice(0, 20).map((r, i) => (
              <div key={r.id} className={`py-3 ${i ? "border-t border-line" : ""}`}>
                <p className="m-0 text-[13px] font-semibold">
                  {r.dinerName}{" "}
                  <span className="font-normal text-faint text-xs">· {fmtDate(r.createdAt)}</span>
                </p>
                <Stars n={r.staffStars} />
                <p className="m-0 mt-0.5 text-[13px] text-sub leading-relaxed">
                  {r.staffComment ? `"${r.staffComment}"` : "Left a rating only."}
                </p>
                <span className="inline-block mt-1">
                  <Pill
                    text={`Overall ${r.overallStars}★`}
                    tone={r.overallStars >= 4 ? "green" : "red"}
                  />
                </span>
              </div>
            ))
          ) : (
            <EmptyState>No ratings in this date range. Widen the date range above.</EmptyState>
          )}
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => { setAddOpen(true); setEditingId(null); setSavedNote(""); }}
          className={primaryBtnCls}
        >
          + Add staff
        </button>
      </div>

      {savedNote && (
        <div className="bg-accentsoft text-accent rounded-lg px-3.5 py-2.5 mb-3 text-[13px] font-medium">
          {savedNote}
        </div>
      )}

      {addOpen && (
        <StaffForm
          title="Add staff"
          initial={{ firstName: "", surname: "", webhookUrl: "" }}
          onSave={async (v) => {
            const m = await addStaff(v.firstName, v.surname, "Waiter", v.webhookUrl);
            if (m) {
              setSavedNote(
                `${m.firstName} is on the team. Their QR code and review link are ready below.`
              );
            }
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      )}

      <div className="bg-accentsoft text-accent rounded-lg px-3.5 py-2.5 mb-4 text-[12.5px]">
        Each staff member has a personal QR code to share after service. One scan captures two
        ratings: their service and the overall visit. Staff ratings never post to Google. They are
        internal coaching data only.
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))" }}>
        {staff.map((s) => {
          const mine = ratingsFor(s.id);
          const a = avgFor(s.id);
          if (editingId === s.id) {
            return (
              <StaffForm
                key={s.id}
                title={`Edit ${s.firstName}`}
                initial={{ firstName: s.firstName, surname: s.surname, webhookUrl: s.webhookUrl }}
                onSave={(v) => {
                  editStaff(s.id, v);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            );
          }
          return (
            <Card key={s.id}>
              <div className="flex items-center gap-3.5">
                <QrCanvas value={staffReviewLink(s.qrSlug)} size={56} />
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-sm font-bold">
                    {s.firstName} {s.surname}
                  </p>
                  <p className="m-0 mt-0.5 text-xs text-sub">
                    {s.category} · {plural(mine.length, "rating", "ratings")} in range
                  </p>
                </div>
                <div className="text-right">
                  <p className="m-0 text-[22px] font-bold">
                    {mine.length ? a.toFixed(1) : "New"}
                    {mine.length ? <span className="text-[13px] text-warn">★</span> : null}
                  </p>
                </div>
              </div>
              {mine.slice(0, 2).map((r) => (
                <p key={r.id} className="m-0 mt-1.5 text-[12.5px] text-sub leading-relaxed">
                  <Stars n={r.staffStars} />{" "}
                  {r.staffComment ? `"${r.staffComment}"` : "Rating only."}{" "}
                  <span className="text-faint">
                    {r.dinerName}, {fmtDate(r.createdAt)}
                  </span>
                </p>
              ))}
              <div className="flex gap-2 flex-wrap mt-3">
                <button onClick={() => setOpenStaffId(s.id)} className={`${ghostBtnCls} !py-1.5 text-xs`}>
                  View comments
                </button>
                <button onClick={() => setEditingId(s.id)} className={`${ghostBtnCls} !py-1.5 text-xs`}>
                  Edit
                </button>
                <button onClick={() => copyLink(s)} className={`${ghostBtnCls} !py-1.5 text-xs`}>
                  {copiedId === s.id ? "Copied" : "Copy link"}
                </button>
                <button
                  onClick={() => downloadQrPng(staffReviewLink(s.qrSlug), `${s.firstName}-${s.surname}-qr.png`)}
                  className={`${ghostBtnCls} !py-1.5 text-xs`}
                >
                  Download QR
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
