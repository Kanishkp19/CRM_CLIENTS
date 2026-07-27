"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, Lock, Mail, User, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

interface AuthProps {
  onSuccess?: () => void;
}

export function AuthView({ onSuccess }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const isPlaceholderUrl = !supabaseUrl || supabaseUrl.includes("placeholder");

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isPlaceholderUrl) {
      // In local demo mode without live Supabase keys, simulate successful auth
      setTimeout(() => {
        setLoading(false);
        setSuccessMsg("Signed in (Demo Mode)");
        if (onSuccess) onSuccess();
      }, 500);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              owner_name: ownerName || email.split("@")[0],
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
          email,
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
            Universal Membership & Lifecycle CRM
          </p>
        </div>

        {isPlaceholderUrl && (
          <div className="mb-6 p-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Supabase Project URL not set in .env</p>
              <p className="mt-0.5 text-amber-700">
                You can sign in using Demo Mode below, or add your Supabase credentials to <code className="bg-amber-100 px-1 rounded text-amber-900">.env</code> to connect a live Supabase project.
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#3ecf8e]" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-[#171717] mb-1">
                Your Full Name / Owner Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#9a9a9a] absolute left-3 top-3" />
                <input
                  type="text"
                  required={!isPlaceholderUrl}
                  placeholder="e.g. Ramesh Kumar"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#dfdfdf] rounded-md focus:outline-none focus:border-[#3ecf8e] text-[#171717]"
                />
              </div>
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
                required={!isPlaceholderUrl}
                placeholder="owner@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#dfdfdf] rounded-md focus:outline-none focus:border-[#3ecf8e] text-[#171717]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9a9a9a] absolute left-3 top-3" />
              <input
                type="password"
                required={!isPlaceholderUrl}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#dfdfdf] rounded-md focus:outline-none focus:border-[#3ecf8e] text-[#171717]"
              />
            </div>
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
                <span>{isPlaceholderUrl ? "Continue in Demo Mode" : isSignUp ? "Create Account" : "Sign In"}</span>
                <ArrowRight className="w-4 h-4 text-[#171717]" />
              </>
            )}
          </button>
        </form>

        {!isPlaceholderUrl && (
          <div className="mt-6 pt-6 border-t border-[#dfdfdf] text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-[#707070] hover:text-[#171717] transition cursor-pointer"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account yet? Create one"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
