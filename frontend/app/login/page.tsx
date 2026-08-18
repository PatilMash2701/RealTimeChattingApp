"use client";
import { redirect } from "next/navigation";
import { ArrowRight, Mail, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useAppData, user_service } from "@/context/AppContext";
import axios from "axios";
import Loading from "@/components/Loading";
import toast from "react-hot-toast";
import AuthShell from "@/components/AuthShell";

const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const { isAuth, loading: userLoading } = useAppData();

  const handleSubmit = async (e: React.FormEvent<HTMLElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post(`${user_service}/api/v1/login`, { email });
      toast.success(data.message);
      router.push(`/verify?email=${email}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Something went wrong. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) return <Loading />;
  if (isAuth) return redirect("/chat");

  return (
    <AuthShell>
      <div className="text-center mb-8">
        <div
          className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center mb-5"
          style={{
            background: "var(--accent-soft)",
            border: "1px solid var(--border)",
          }}
        >
          <Mail size={28} style={{ color: "var(--accent)" }} />
        </div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Sign in to continue
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          We&apos;ll send a secure verification code to your email
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Email address
          </label>
          <input
            type="email"
            id="email"
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sending code…
            </>
          ) : (
            <>
              <span>Continue with email</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
};

export default Login;
