import { useMemo, useState } from "react";
import {
  Card, EmptyState, ErrorText, FieldLabel, Pill, SectionLabel,
  dangerBtnCls, ghostBtnCls, inputCls, primaryBtnCls,
} from "../components/ui";
import { useStore } from "../data/store";
import { TODAY } from "../data/generate";
import type { Contact } from "../data/types";
import { daysBetween, fmtDate, normalizePhone, plural } from "../lib/format";

/** PRD §7: any active offer must surface plainly wherever a contact is found. */
function ActiveOfferNote({ contactId }: { contactId: number }) {
  const { activeOfferFor, markClaimed } = useStore();
  const offer = activeOfferFor(contactId);
  if (!offer) return null;
  const daysLeft = Math.max(0, daysBetween(TODAY, offer.entry.offerExpiresAt));
  return (
    <span className="flex items-center gap-2 flex-wrap">
      <span className="text-[12.5px] text-warn font-semibold">
        Has an active offer: {offer.campaign.offerText}. {plural(daysLeft, "day", "days")} left.
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          markClaimed(offer.entry.id);
        }}
        className="text-xs px-2.5 py-1 rounded-lg bg-good text-white font-semibold"
      >
        Mark as claimed
      </button>
    </span>
  );
}

function SendReviewCard({ onClose }: { onClose: () => void }) {
  const { contacts, sendReviewRequest } = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contact[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sent, setSent] = useState<Contact | null>(null);

  const recent = useMemo(
    () => [...contacts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 3),
    [contacts]
  );

  const find = () => {
    const q = query.trim().toLowerCase();
    const qPhone = normalizePhone(query);
    setResults(
      q
        ? contacts.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              (qPhone.length >= 3 && normalizePhone(c.phone).includes(qPhone))
          )
        : []
    );
  };

  const selectable = (c: Contact, first: boolean) => (
    <button
      key={c.id}
      onClick={() => setSelectedId(c.id)}
      className={`w-full text-left flex flex-wrap items-center gap-2 py-2.5 px-2 rounded-lg ${
        first ? "" : "border-t border-line"
      } ${selectedId === c.id ? "bg-accentsoft" : "hover:bg-canvas"}`}
    >
      <span className="text-[13px] font-semibold flex-1">{c.name}</span>
      <span className="text-[13px] text-sub">{c.phone}</span>
      {selectedId === c.id && <Pill text="Selected" tone="blue" />}
      <span className="basis-full">
        <ActiveOfferNote contactId={c.id} />
      </span>
    </button>
  );

  if (sent) {
    return (
      <Card className="border-accent mb-4">
        <p className="m-0 text-[15px] font-semibold text-accent">Send review</p>
        <p className="text-[13px] text-ink mt-2">
          Done. The review request is on its way to {sent.name} on WhatsApp.
        </p>
        <button onClick={onClose} className={`${ghostBtnCls} mt-2`}>
          Close
        </button>
      </Card>
    );
  }

  return (
    <Card className="border-accent mb-4">
      <p className="m-0 text-[15px] font-semibold text-accent">Send review</p>
      <p className="text-[13px] text-sub mt-1 mb-3">
        Tap one of your recent adds, or find the customer by WhatsApp number.
      </p>

      <SectionLabel>Your recent adds</SectionLabel>
      <div>{recent.map((c, i) => selectable(c, i === 0))}</div>

      <div className="flex flex-wrap gap-2 items-center mt-4 mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && find()}
          placeholder="Search by name or number"
          className={`${inputCls} flex-1 min-w-[200px]`}
        />
        <button onClick={find} className={primaryBtnCls}>
          Find
        </button>
      </div>
      {results !== null &&
        (results.length ? (
          <div>{results.map((c, i) => selectable(c, i === 0))}</div>
        ) : (
          <EmptyState>
            No customer matches that search. Check the number, or add them with Add contact first.
          </EmptyState>
        ))}

      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-line">
        <div className="flex-1" />
        <button onClick={onClose} className={ghostBtnCls}>
          Cancel
        </button>
        <button
          disabled={selectedId === null}
          onClick={() => {
            if (selectedId === null) return;
            sendReviewRequest(selectedId, null);
            setSent(contacts.find((c) => c.id === selectedId) ?? null);
          }}
          className={primaryBtnCls}
        >
          Send review
        </button>
      </div>
    </Card>
  );
}

export function CustomersPage() {
  const { contacts, addContact, editContact, deleteContact } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "" });
  const [draftErr, setDraftErr] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", phone: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [savedNote, setSavedNote] = useState("");

  const sorted = useMemo(
    () => [...contacts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [contacts]
  );

  const saveNew = () => {
    if (!draft.name.trim()) return setDraftErr("Enter the customer's name.");
    if (!draft.phone.trim()) return setDraftErr("Enter a WhatsApp number.");
    const existing = contacts.find(
      (x) => normalizePhone(x.phone) === normalizePhone(draft.phone)
    );
    const c = addContact(draft.name, draft.phone, "Manager");
    setSavedNote(
      existing
        ? `${c.name} is already in your list. We matched them by phone and noted the visit.`
        : `${c.name} is saved and ready for campaigns.`
    );
    setDraft({ name: "", phone: "" });
    setDraftErr("");
    setAddOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => {
            setAddOpen(true);
            setSendOpen(false);
            setSavedNote("");
          }}
          className={primaryBtnCls}
        >
          + Add contact
        </button>
        <button
          onClick={() => {
            setSendOpen(true);
            setAddOpen(false);
            setSavedNote("");
          }}
          className={ghostBtnCls}
        >
          Send review
        </button>
      </div>

      {savedNote && (
        <div className="bg-accentsoft text-accent rounded-lg px-3.5 py-2.5 mb-3 text-[13px] font-medium">
          {savedNote}
        </div>
      )}

      {addOpen && (
        <Card className="border-accent mb-4">
          <p className="m-0 mb-3 text-[15px] font-semibold text-accent">Add contact</p>
          <div className="flex flex-wrap gap-2.5 items-end">
            <div className="flex-1 min-w-[200px]">
              <FieldLabel>Name</FieldLabel>
              <input
                value={draft.name}
                onChange={(e) => {
                  setDraft({ ...draft, name: e.target.value });
                  setDraftErr("");
                }}
                placeholder="Customer name"
                className={inputCls}
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <FieldLabel>WhatsApp number</FieldLabel>
              <input
                value={draft.phone}
                onChange={(e) => {
                  setDraft({ ...draft, phone: e.target.value });
                  setDraftErr("");
                }}
                placeholder="082 000 0000"
                className={inputCls}
              />
            </div>
            <button onClick={saveNew} className={primaryBtnCls}>
              Save contact
            </button>
            <button
              onClick={() => {
                setAddOpen(false);
                setDraftErr("");
              }}
              className={ghostBtnCls}
            >
              Cancel
            </button>
          </div>
          {draftErr && <ErrorText>{draftErr}</ErrorText>}
        </Card>
      )}

      {sendOpen && <SendReviewCard onClose={() => setSendOpen(false)} />}

      <SectionLabel>Contact list</SectionLabel>
      <Card className="py-1 px-4">
        <div className="grid grid-cols-[1.6fr_1.2fr_1.2fr_1fr_1.4fr] gap-2 py-3 text-[11.5px] text-faint tracking-wide border-b border-line">
          <span>NAME</span>
          <span>PHONE</span>
          <span>ADDED BY</span>
          <span>DATE</span>
          <span>ACTIONS</span>
        </div>
        {sorted.length ? (
          sorted.map((c) => (
            <div key={c.id} className="border-b border-line last:border-b-0">
              {editingId === c.id ? (
                <div className="flex flex-wrap gap-2 items-center py-2.5">
                  <input
                    value={editDraft.name}
                    onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                    className={`${inputCls} flex-1 min-w-[160px]`}
                    aria-label="Edit name"
                  />
                  <input
                    value={editDraft.phone}
                    onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })}
                    className={`${inputCls} flex-1 min-w-[140px]`}
                    aria-label="Edit phone"
                  />
                  <button
                    onClick={() => {
                      if (editDraft.name.trim() && editDraft.phone.trim()) {
                        editContact(c.id, editDraft.name, editDraft.phone);
                        setEditingId(null);
                      }
                    }}
                    className={primaryBtnCls}
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className={ghostBtnCls}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-[1.6fr_1.2fr_1.2fr_1fr_1.4fr] gap-2 py-3 text-[13px] items-center">
                  <span className="font-semibold">
                    {c.name}
                    <span className="block">
                      <ActiveOfferNote contactId={c.id} />
                    </span>
                  </span>
                  <span className="text-sub">{c.phone}</span>
                  <span className="text-sub">{c.addedBy}</span>
                  <span className="text-sub">{fmtDate(c.createdAt)}</span>
                  <span className="flex gap-1.5 flex-wrap">
                    {confirmDeleteId === c.id ? (
                      <>
                        <button
                          onClick={() => {
                            deleteContact(c.id);
                            setConfirmDeleteId(null);
                          }}
                          className={`${dangerBtnCls} !px-2.5 !py-1 text-xs`}
                        >
                          Confirm delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className={`${ghostBtnCls} !px-2.5 !py-1 text-xs`}
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setEditDraft({ name: c.name, phone: c.phone });
                          }}
                          className={`${ghostBtnCls} !px-2.5 !py-1 text-xs`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className={`${ghostBtnCls} !px-2.5 !py-1 text-xs !text-bad`}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          ))
        ) : (
          <EmptyState>
            No contacts yet. Tap Add contact to capture your first customer.
          </EmptyState>
        )}
      </Card>
    </>
  );
}
