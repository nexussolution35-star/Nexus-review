import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorText, FieldLabel, ghostBtnCls, inputCls, primaryBtnCls } from "../../components/ui";
import { useAuth } from "../../data/auth";
import { AuthShell } from "./AuthShell";

/**
 * Manager onboarding (PRD 9). Step 1 is the compulsory account. Step 2 is the
 * optional brand and Google details, which can be skipped and edited later in
 * the Manager area. Only the compulsory step is required to finish.
 */
export function Signup() {
  const { signUpManager } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [restaurantName, setRestaurantName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const finish = async () => {
    setBusy(true);
    const { error } = await signUpManager({ restaurantName, managerName, email, password });
    setBusy(false);
    if (error) {
      setErr(error);
      setStep(1);
      return;
    }
    navigate("/");
  };

  return (
    <AuthShell
      title={step === 1 ? "Create your restaurant" : "Make it yours"}
      subtitle={
        step === 1
          ? "A minute to set up. You can change everything later."
          : "Optional touches. Skip any of these and add them later."
      }
      footer={
        step === 1 ? (
          <>
            Already have an account?{" "}
            <Link to="/login" className="text-accent font-semibold no-underline">
              Sign in
            </Link>
          </>
        ) : null
      }
    >
      {step === 1 ? (
        <div className="grid gap-3">
          <div>
            <FieldLabel>Restaurant name</FieldLabel>
            <input
              value={restaurantName}
              onChange={(e) => { setRestaurantName(e.target.value); setErr(""); }}
              className={inputCls}
              placeholder="The Fireside Grill"
            />
          </div>
          <div>
            <FieldLabel>Your name</FieldLabel>
            <input
              value={managerName}
              onChange={(e) => { setManagerName(e.target.value); setErr(""); }}
              className={inputCls}
              placeholder="Manager full name"
            />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(""); }}
              className={inputCls}
              placeholder="you@restaurant.com"
              autoComplete="email"
            />
          </div>
          <div>
            <FieldLabel>Password</FieldLabel>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErr(""); }}
              className={inputCls}
              placeholder="Choose a password"
              autoComplete="new-password"
            />
          </div>
          {err && <ErrorText>{err}</ErrorText>}
          <button
            onClick={() => {
              if (!restaurantName.trim()) return setErr("Enter your restaurant name.");
              if (!managerName.trim()) return setErr("Enter your name.");
              if (!email.trim()) return setErr("Enter your email.");
              if (password.length < 6) return setErr("Use a password of at least 6 characters.");
              setErr("");
              setStep(2);
            }}
            className={`${primaryBtnCls} w-full !py-3 mt-1`}
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="text-[13px] text-sub m-0">
            You are all set to finish. Brand colors, your logo, and your Google review link live in
            the Manager area, so you can add them any time without slowing down today.
          </p>
          {err && <ErrorText>{err}</ErrorText>}
          <button onClick={finish} disabled={busy} className={`${primaryBtnCls} w-full !py-3`}>
            {busy ? "Creating…" : "Create my dashboard"}
          </button>
          <button onClick={() => setStep(1)} className={`${ghostBtnCls} w-full`}>
            Back
          </button>
        </div>
      )}
    </AuthShell>
  );
}
