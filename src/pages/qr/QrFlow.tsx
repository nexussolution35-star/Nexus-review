import { useState } from "react";
import { useParams } from "react-router-dom";
import { ErrorText, StarInput, inputCls, primaryBtnCls } from "../../components/ui";
import { useStore } from "../../data/store";
import {
  GOOGLE_INVITE_MIN_COMBINED,
  GOOGLE_REVIEW_URL,
  RESTAURANT_NAME,
} from "../../data/generate";

/**
 * PRD §4: the customer facing mobile page behind each staff member's QR code.
 * Step 1 captures the contact. Step 2 takes two ratings. Step 3 shows the
 * Google invite only when the combined score qualifies AND the overall rating
 * is good. When staff stars are high but the overall visit was bad, the bad
 * route wins and no Google invite is shown.
 */
export function QrFlow() {
  const { slug } = useParams<{ slug: string }>();
  const { staff, submitQrReview } = useStore();
  const member = staff.find((s) => s.qrSlug === slug);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [staffStars, setStaffStars] = useState(0);
  const [comment, setComment] = useState("");
  const [overallStars, setOverallStars] = useState(0);
  const [result, setResult] = useState<{ invite: boolean } | null>(null);

  if (!member) {
    return (
      <PhoneFrame>
        <p className="text-lg font-bold">Hmm, that link does not look right.</p>
        <p className="text-[14px] text-sub mt-2">
          Please ask your server for a fresh QR code.
        </p>
      </PhoneFrame>
    );
  }

  const firstName = name.trim().split(" ")[0] || "there";

  const submit = () => {
    if (!staffStars) return setErr("Please tap a star for the service rating.");
    if (!overallStars) return setErr("Please tap a star for your overall visit.");
    submitQrReview({
      name: name.trim(),
      phone: phone.trim(),
      staffId: member.id,
      staffStars,
      staffComment: comment.trim() || null,
      overallStars,
    });
    const combined = staffStars + overallStars;
    const invite = overallStars >= 4 && combined >= GOOGLE_INVITE_MIN_COMBINED;
    setResult({ invite });
    setStep(3);
    setErr("");
  };

  return (
    <PhoneFrame>
      {step === 1 && (
        <>
          <p className="text-lg font-bold m-0">Hi! Thanks for visiting {RESTAURANT_NAME}.</p>
          <p className="text-[14px] text-sub mt-1.5">
            Tell us who you are so {member.firstName} knows who to thank.
          </p>
          <div className="mt-4 grid gap-3">
            <div>
              <label className="block text-xs text-sub mb-1">Your name</label>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setErr(""); }}
                className={inputCls}
                placeholder="Name"
              />
            </div>
            <div>
              <label className="block text-xs text-sub mb-1">WhatsApp number</label>
              <input
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErr(""); }}
                className={inputCls}
                placeholder="082 000 0000"
                inputMode="tel"
              />
            </div>
          </div>
          <p className="text-[11.5px] text-faint mt-3 leading-relaxed">
            We may WhatsApp you about your visit and occasional offers. Reply STOP any time to opt
            out.
          </p>
          {err && <ErrorText>{err}</ErrorText>}
          <button
            onClick={() => {
              if (!name.trim()) return setErr("Please enter your name.");
              if (!phone.trim()) return setErr("Please enter your WhatsApp number.");
              setStep(2);
              setErr("");
            }}
            className={`${primaryBtnCls} w-full mt-4 !py-3`}
          >
            Next
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-lg font-bold m-0">Two quick ratings, {firstName}.</p>
          <div className="mt-5">
            <p className="text-[14px] font-semibold m-0">
              How would you rate {member.firstName}'s service to you today?
            </p>
            <div className="mt-2">
              <StarInput value={staffStars} onChange={(n) => { setStaffStars(n); setErr(""); }} />
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Anything you want to add? (optional)"
              className={`${inputCls} resize-y mt-2.5`}
            />
          </div>
          <div className="mt-5">
            <p className="text-[14px] font-semibold m-0">
              How would you rate the overall experience today at {RESTAURANT_NAME}?
            </p>
            <div className="mt-2">
              <StarInput value={overallStars} onChange={(n) => { setOverallStars(n); setErr(""); }} />
            </div>
          </div>
          {err && <ErrorText>{err}</ErrorText>}
          <button onClick={submit} className={`${primaryBtnCls} w-full mt-5 !py-3`}>
            Send
          </button>
        </>
      )}

      {step === 3 && result && (
        <>
          {result.invite ? (
            <>
              <p className="text-lg font-bold m-0">Thank you, {firstName}! That made our day.</p>
              <p className="text-[14px] text-sub mt-3 leading-relaxed">
                Could you give us a Google review? It helps us grow and serve you better.
              </p>
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noreferrer"
                className={`${primaryBtnCls} block w-full mt-4 !py-3 text-center no-underline`}
              >
                Give us a Google review
              </a>
            </>
          ) : (
            <>
              <p className="text-lg font-bold m-0">Thank you, {firstName}.</p>
              <p className="text-[14px] text-sub mt-3 leading-relaxed">
                We really appreciate you telling us. The team reads every single message and we
                will use yours to do better. We hope to see you again soon.
              </p>
            </>
          )}
        </>
      )}
    </PhoneFrame>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-6">
        <p className="text-[11px] text-faint tracking-wide uppercase mb-4">{RESTAURANT_NAME}</p>
        {children}
      </div>
    </div>
  );
}
