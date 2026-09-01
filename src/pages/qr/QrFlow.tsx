import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ErrorText, StarInput, inputCls, primaryBtnCls } from "../../components/ui";
import { supabase, supabaseReady } from "../../lib/supabase";
import { GOOGLE_REVIEW_URL } from "../../data/constants";

/**
 * PRD §4: the customer facing mobile page behind each staff member's QR code.
 * Diners are anonymous, so this page loads its context and saves the review
 * through public Edge Functions (review-context, submit-review) rather than the
 * logged-in store. Step 1 captures the contact, step 2 takes two ratings, step
 * 3 shows the Google invite only when the overall rating is good AND the
 * combined score qualifies.
 */
interface Context {
  found: boolean;
  staffId?: string;
  staffFirstName?: string;
  restaurant?: string;
  googleInviteMinCombined?: number;
  googleReviewUrl?: string | null;
}

export function QrFlow() {
  const { slug } = useParams<{ slug: string }>();
  const [ctx, setCtx] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [staffStars, setStaffStars] = useState(0);
  const [comment, setComment] = useState("");
  const [overallStars, setOverallStars] = useState(0);
  const [result, setResult] = useState<{ invite: boolean } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabaseReady || !slug) {
        if (active) { setCtx({ found: false }); setLoading(false); }
        return;
      }
      const { data, error } = await supabase.functions.invoke("review-context", {
        body: { slug },
      });
      if (!active) return;
      setCtx(error ? { found: false } : (data as Context));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  if (loading) {
    return (
      <PhoneFrame restaurant="">
        <p className="text-[14px] text-sub">Loading…</p>
      </PhoneFrame>
    );
  }

  if (!ctx?.found) {
    return (
      <PhoneFrame restaurant="">
        <p className="text-lg font-bold">Hmm, that link does not look right.</p>
        <p className="text-[14px] text-sub mt-2">
          Please ask your server for a fresh QR code.
        </p>
      </PhoneFrame>
    );
  }

  const restaurant = ctx.restaurant ?? "our restaurant";
  const staffFirstName = ctx.staffFirstName ?? "the team";
  const minCombined = ctx.googleInviteMinCombined ?? 7;
  const googleUrl = ctx.googleReviewUrl ?? GOOGLE_REVIEW_URL;
  const firstName = name.trim().split(" ")[0] || "there";

  const submit = async () => {
    if (!staffStars) return setErr("Please tap a star for the service rating.");
    if (!overallStars) return setErr("Please tap a star for your overall visit.");
    setSending(true);
    setErr("");
    const { data, error } = await supabase.functions.invoke("submit-review", {
      body: {
        slug,
        name: name.trim(),
        phone: phone.trim(),
        staffStars,
        staffComment: comment.trim() || null,
        overallStars,
      },
    });
    setSending(false);
    if (error) {
      setErr("Something went wrong sending your review. Please try again.");
      return;
    }
    const invite = Boolean(
      (data as { invite?: boolean })?.invite ??
        (overallStars >= 4 && staffStars + overallStars >= minCombined)
    );
    setResult({ invite });
    setStep(3);
  };

  return (
    <PhoneFrame restaurant={restaurant}>
      {step === 1 && (
        <>
          <p className="text-lg font-bold m-0">How did we do today?</p>
          <p className="text-[14px] text-sub mt-1.5">
            Your visit matters to us at {restaurant}. Add your name and number, then leave a
            quick rating. It takes 30 seconds, and {staffFirstName} would love to know how they
            did.
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
            We will only WhatsApp you about this visit and the odd treat. Reply STOP any time to opt
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
            Rate my visit
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-lg font-bold m-0">Two quick ratings, {firstName}.</p>
          <div className="mt-5">
            <p className="text-[14px] font-semibold m-0">
              How would you rate {staffFirstName}'s service to you today?
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
              How would you rate the overall experience today at {restaurant}?
            </p>
            <div className="mt-2">
              <StarInput value={overallStars} onChange={(n) => { setOverallStars(n); setErr(""); }} />
            </div>
          </div>
          {err && <ErrorText>{err}</ErrorText>}
          <button onClick={submit} disabled={sending} className={`${primaryBtnCls} w-full mt-5 !py-3`}>
            {sending ? "Sending…" : "Send"}
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
                href={googleUrl}
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

function PhoneFrame({ children, restaurant }: { children: React.ReactNode; restaurant: string }) {
  return (
    <div className="min-h-screen bg-canvas flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-6">
        <p className="text-[11px] text-faint tracking-wide uppercase mb-4">
          {restaurant || " "}
        </p>
        {children}
      </div>
    </div>
  );
}
