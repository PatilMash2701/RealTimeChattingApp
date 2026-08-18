"use client";

import { useAppData } from "@/context/AppContext";
import { ArrowLeft, User, Mail, Shield, Check, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import Loading from "@/components/Loading";
import ImageModal from "@/components/ImageModal";
import { APP_NAME } from "@/lib/brand";

const ProfilePage = () => {
  const { user, loading, isAuth, updateProfile, updateProfilePic } = useAppData();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [updating, setUpdating] = useState(false);
  const [picUpdating, setPicUpdating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (!isAuth) {
    router.push("/login");
    return null;
  }

  const handleUpdate = async () => {
    if (!name.trim()) return;
    setUpdating(true);
    await updateProfile(name);
    setUpdating(false);
    setIsEditing(false);
  };

  const handlePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicUpdating(true);
    const formData = new FormData();
    formData.append("image", file);
    await updateProfilePic(formData);
    setPicUpdating(false);
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col items-center p-6 sm:p-12">
      <ImageModal
        isOpen={!!previewImage}
        url={previewImage || ""}
        onClose={() => setPreviewImage(null)}
      />
      <div className="max-w-2xl w-full animate-fade-up">
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => router.push("/chat")}
            className="p-3 rounded-xl glass-panel transition-all hover:scale-105"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">
              Your profile
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {APP_NAME} account settings
            </p>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-8 sm:p-10">
          <div
            className="flex flex-col sm:flex-row items-center gap-8 mb-10 pb-10"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="relative group">
              <input
                type="file"
                className="hidden"
                id="profilePicInput"
                accept="image/*"
                onChange={handlePicChange}
              />
              <div className="relative transition-transform hover:scale-[1.02]">
                {user?.profilePic?.url ? (
                  <img
                    src={user.profilePic.url}
                    alt={user.name}
                    onClick={() => setPreviewImage(user.profilePic!.url)}
                    className={`w-32 h-32 rounded-2xl object-cover cursor-zoom-in ${picUpdating ? "opacity-50" : ""}`}
                    style={{
                      border: "3px solid var(--border)",
                      boxShadow: "0 12px 40px var(--accent-glow)",
                    }}
                  />
                ) : (
                  <div
                    className={`w-32 h-32 rounded-2xl flex items-center justify-center text-5xl font-bold text-white ${picUpdating ? "opacity-70" : ""}`}
                    style={{
                      background:
                        "linear-gradient(135deg, var(--bubble-sent-from), var(--bubble-sent-to))",
                    }}
                  >
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {picUpdating && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-8 h-8 border-[3px] border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                    />
                  </div>
                )}
                <label
                  htmlFor="profilePicInput"
                  className="absolute -bottom-1 -right-1 p-2.5 rounded-xl text-white cursor-pointer transition-transform hover:scale-110"
                  style={{
                    background: "linear-gradient(135deg, var(--bubble-sent-from), var(--bubble-sent-to))",
                    border: "3px solid var(--bg-primary)",
                  }}
                  title="Change profile photo"
                >
                  <Edit2 className="w-4 h-4" />
                </label>
              </div>
              <div
                className="absolute -top-1 -right-1 rounded-full p-2"
                style={{ background: "var(--success)", border: "3px solid var(--bg-primary)" }}
              >
                <Shield className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input-field text-xl font-bold flex-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="p-3 rounded-xl text-white shrink-0 disabled:opacity-50"
                    style={{ background: "var(--success)" }}
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <h2 className="text-2xl font-bold">{user?.name}</h2>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-lg transition-colors hover:opacity-80"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-sm font-medium mt-2" style={{ color: "var(--accent)" }}>
                Verified account
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl glass-panel space-y-2">
              <div
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                <Mail className="w-4 h-4" />
                Email
              </div>
              <p className="text-lg font-medium truncate">{user?.email}</p>
            </div>
            <div className="p-5 rounded-2xl glass-panel space-y-2">
              <div
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                <User className="w-4 h-4" />
                Status
              </div>
              <p className="text-lg font-medium flex items-center gap-2" style={{ color: "var(--success)" }}>
                <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                Online & active
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Your data is protected with secure authentication and encrypted messaging.
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;
