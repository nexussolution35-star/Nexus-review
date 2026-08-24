import type { ReactNode } from "react";
import { RESTAURANT_NAME } from "../../data/constants";

/** Centered card shell shared by Sign in and Sign up, matching the app style. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <p className="text-xl font-bold m-0">Rave</p>
          <p className="text-[11px] text-faint mt-0.5">Powered by Nexus Solution</p>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-6">
          <p className="text-lg font-bold m-0">{title}</p>
          <p className="text-[13px] text-sub mt-1 mb-5">{subtitle}</p>
          {children}
        </div>
        {footer && <div className="text-center mt-4 text-[13px] text-sub">{footer}</div>}
        <p className="text-center text-[11px] text-faint mt-6">
          Get raves. Keep regulars. {RESTAURANT_NAME} runs on Rave.
        </p>
      </div>
    </div>
  );
}
