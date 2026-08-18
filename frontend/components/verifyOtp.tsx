"use client";
import { Lock, Loader2, ArrowRight, ChevronLeft } from "lucide-react";
import { redirect, useSearchParams, useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { user_service, useAppData } from "@/context/AppContext";
import Loading from "./Loading";
import toast from "react-hot-toast";
import AuthShell from "./AuthShell";

const VerifyOtp = () => {
  const { isAuth, setIsAuth, setUser, loading: userLoading, fetchChats, fetchUsers } =
    useAppData();
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string>("");
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);

  const inputRefs = useRef<Array<HTMLInputElement>>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email: string = searchParams.get("email") || "";

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleInputChange = (index: number, value: string): void => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLElement>): void => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").slice(0, 6);
    if (digits.length === 6) {
      setOtp(digits.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${user_service}/api/v1/verify`, {
        email,
        otp: otpString,
      });
      toast.success(data.message);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setUser(data.user);
      setIsAuth(true);
      fetchChats();
      fetchUsers();
    } catch (error: any) {
      setError(error.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${user_service}/api/v1/login`, { email });
      toast.success(data.message);
      setTimer(60);
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to resend");
    } finally {
      setResendLoading(false);
    }
  };

  if (userLoading) return <Loading />;
  if (isAuth) redirect("/chat");

  return (
    <AuthShell>
      <div className="relative mb-8">
        <button
          type="button"
          className="absolute left-0 top-0 p-2 rounded-lg transition-colors hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => router.push("/login")}
          aria-label="Back to login"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center pt-2">
          <div
            className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center mb-5"
            style={{
              background: "var(--accent-soft)",
              border: "1px solid var(--border)",
            }}
          >
            <Lock size={28} style={{ color: "var(--accent)" }} />
          </div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Verify your email
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Enter the 6-digit code sent to
          </p>
          <p className="mt-1 text-sm font-medium gradient-text">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            className="block text-sm font-medium mb-4 text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            Verification code
          </label>
          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el: HTMLInputElement | null) => {
                  if (el) inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl transition-all"
                style={{
                  background: "var(--bg-input)",
                  border: "2px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--accent)";
                  e.target.style.boxShadow = "0 0 0 3px var(--accent-soft)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border)";
                  e.target.style.boxShadow = "none";
                }}
              />
            ))}
          </div>
        </div>

        {error && (
          <div
            className="rounded-xl p-3 text-sm text-center"
            style={{
              background: "rgba(244, 63, 94, 0.1)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "var(--danger)",
            }}
          >
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              <span>Verify & continue</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
          Didn&apos;t receive the code?
        </p>
        {timer > 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Resend in <span className="font-semibold">{timer}s</span>
          </p>
        ) : (
          <button
            type="button"
            className="text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ color: "var(--accent)" }}
            disabled={resendLoading}
            onClick={handleResendOtp}
          >
            {resendLoading ? "Sending…" : "Resend code"}
          </button>
        )}
      </div>
    </AuthShell>
  );
};

export default VerifyOtp;
