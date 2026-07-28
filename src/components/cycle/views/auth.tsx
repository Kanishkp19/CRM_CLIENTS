"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, Lock, Mail, User, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

interface AuthProps {
  onSuccess?: () => void;
}

interface FieldErrors {
  ownerName?: string;
  email?: string;
  password?: string;
}

export function AuthView({ onSuccess }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const supabase = createClient();

  function validateFields(): FieldErrors {
    const errors: FieldErrors = {};

    if (isSignUp && !ownerName.trim()) {
      errors.ownerName = "Please enter your name.";
    }

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    return errors;
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errors = validateFields();
    setFieldErrors(errors);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Mark all fields as touched so errors appear
    setTouched({ ownerName: true, email: true, password: true });
    const errors = validateFields();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: origin ? `${origin}` : "https://crm-clients-eight.vercel.app",
            data: {
              owner_name: ownerName.trim() || email.split("@")[0],
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMsg("Account created successfully!");
          if (onSuccess) onSuccess();
        } else {
          setSuccessMsg("Check your email for the confirmation link to complete sign up!");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMsg("Signed in successfully!");
          if (onSuccess) onSuccess();
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setIsSignUp(!isSignUp);
    setErrorMsg(null);
    setSuccessMsg(null);
    setFieldErrors({});
    setTouched({});
    setOwnerName("");
    setEmail("");
    setPassword("");
  }

  const showOwnerError = touched.ownerName && fieldErrors.ownerName;
  const showEmailError = touched.email && fieldErrors.email;
  const showPasswordError = touched.password && fieldErrors.password;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#dfdfdf] rounded-xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="h-3 w-3 rounded-full bg-[#3ecf8e]" />
            <span className="font-semibold text-xl tracking-tight text-[#171717]">Cycle CRM</span>
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-[#171717]">
            {isSignUp ? "Create your business account" : "Sign in to your dashboard"}
          </h1>
          <p className="text-sm text-[#707070] mt-1">
            Universal Membership &amp; Lifecycle CRM
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#3ecf8e]" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">
                Your Full Name / Owner Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#9a9a9a] absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  onBlur={() => handleBlur("ownerName")}
                  className={`w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:border-[#3ecf8e] text-[#171717] transition ${
                    showOwnerError ? "border-red-400 bg-red-50" : "border-[#dfdfdf]"
                  }`}
                />
              </div>
              {showOwnerError && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.ownerName}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9a9a9a] absolute left-3 top-3" />
              <input
                type="email"
                placeholder="owner@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur("email")}
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:border-[#3ecf8e] text-[#171717] transition ${
                  showEmailError ? "border-red-400 bg-red-50" : "border-[#dfdfdf]"
                }`}
              />
            </div>
            {showEmailError && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9a9a9a] absolute left-3 top-3" />
              <input
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur("password")}
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:border-[#3ecf8e] text-[#171717] transition ${
                  showPasswordError ? "border-red-400 bg-red-50" : "border-[#dfdfdf]"
                }`}
              />
            </div>
            {showPasswordError && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] font-medium text-sm rounded-md transition flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#171717]" />
            ) : (
              <>
                <span>{isSignUp ? "Create Account" : "Sign In"}</span>
                <ArrowRight className="w-4 h-4 text-[#171717]" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#dfdfdf] text-center">
          <button
            type="button"
            onClick={switchMode}
            className="text-xs text-[#707070] hover:text-[#171717] transition cursor-pointer"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account yet? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
