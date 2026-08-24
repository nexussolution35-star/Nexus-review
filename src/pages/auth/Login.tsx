import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorText, FieldLabel, inputCls, primaryBtnCls } from "../../components/ui";
import { useAuth } from "../../data/auth";
import { AuthShell } from "./AuthShell";

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setErr("Enter your email and password.");
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) return setErr(error);
    navigate("/");
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Rave dashboard."
      footer={
        <>
          New restaurant?{" "}
          <Link to="/signup" className="text-accent font-semibold no-underline">
            Create your account
          </Link>
        </>
      }
    >
      <div className="grid gap-3">
        <div>
          <FieldLabel>Email</FieldLabel>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
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
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className={inputCls}
            placeholder="Your password"
            autoComplete="current-password"
          />
        </div>
        {err && <ErrorText>{err}</ErrorText>}
        <button onClick={submit} disabled={busy} className={`${primaryBtnCls} w-full !py-3 mt-1`}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </AuthShell>
  );
}
