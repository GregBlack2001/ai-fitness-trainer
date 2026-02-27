"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  User,
  Target,
  Mail,
  AlertTriangle,
  Trash2,
  Save,
  CheckCircle2,
  KeyRound,
  ChevronRight,
  LogOut,
  Shield,
  Dumbbell,
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email || "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
        setAge(profileData.age?.toString() || "");
        setGender(profileData.gender || "");
        setHeightCm(profileData.height_cm?.toString() || "");
        setWeightKg(profileData.weight_kg?.toString() || "");
        setFitnessGoal(profileData.fitness_goal || "");
        setFitnessLevel(profileData.fitness_level || "");
      }

      setLoading(false);
    };

    loadProfile();
  }, [supabase, router]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    const updates = {
      full_name: fullName,
      age: age ? parseInt(age) : null,
      gender,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      fitness_goal: fitnessGoal,
      fitness_level: fitnessLevel,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      console.error("Error saving:", error);
      alert("Failed to save. Please try again.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }

    setSaving(false);
  };

  const handlePasswordChange = async () => {
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setPasswordChanging(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error: any) {
      setPasswordError(error.message || "Failed to change password");
    } finally {
      setPasswordChanging(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE" || !userId) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await supabase.auth.signOut();
        router.push("/");
      } else {
        alert(
          `Failed to delete account: ${data.error || "Unknown error"}${data.details ? `\n\nDetails: ${data.details}` : ""}`,
        );
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center animate-pulse">
            <User className="h-7 w-7 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800/50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Profile Header */}
        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
            {getInitials(fullName)}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">
              {fullName || "User"}
            </h2>
            <p className="text-sm text-slate-400">{userEmail}</p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider px-1">
            Personal Info
          </h3>
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 divide-y divide-slate-700/50">
            <div className="p-4">
              <Label className="text-slate-400 text-xs">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 bg-transparent border-0 p-0 h-auto text-white text-base focus-visible:ring-0"
                placeholder="Your name"
              />
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400 text-xs">Age</Label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="mt-1 bg-transparent border-0 p-0 h-auto text-white text-base focus-visible:ring-0"
                  placeholder="25"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="mt-1 bg-transparent border-0 p-0 h-auto text-white focus:ring-0">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400 text-xs">Height (cm)</Label>
                <Input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="mt-1 bg-transparent border-0 p-0 h-auto text-white text-base focus-visible:ring-0"
                  placeholder="175"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="mt-1 bg-transparent border-0 p-0 h-auto text-white text-base focus-visible:ring-0"
                  placeholder="70"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fitness Profile */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider px-1">
            Fitness Profile
          </h3>
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 divide-y divide-slate-700/50">
            <div className="p-4">
              <Label className="text-slate-400 text-xs">Fitness Goal</Label>
              <Select value={fitnessGoal} onValueChange={setFitnessGoal}>
                <SelectTrigger className="mt-1 bg-transparent border-0 p-0 h-auto text-white focus:ring-0">
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="lose weight">Lose Weight</SelectItem>
                  <SelectItem value="build muscle">Build Muscle</SelectItem>
                  <SelectItem value="get stronger">Get Stronger</SelectItem>
                  <SelectItem value="improve endurance">
                    Improve Endurance
                  </SelectItem>
                  <SelectItem value="general fitness">
                    General Fitness
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4">
              <Label className="text-slate-400 text-xs">Fitness Level</Label>
              <Select value={fitnessLevel} onValueChange={setFitnessLevel}>
                <SelectTrigger className="mt-1 bg-transparent border-0 p-0 h-auto text-white focus:ring-0">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>

        {/* Account & Security */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider px-1">
            Account & Security
          </h3>
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 divide-y divide-slate-700/50">
            <button
              onClick={() => setShowPasswordDialog(true)}
              className="w-full p-4 flex items-center gap-3 hover:bg-slate-700/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-slate-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-white">Change Password</p>
                <p className="text-sm text-slate-500">Update your password</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </button>

            <button
              onClick={handleSignOut}
              className="w-full p-4 flex items-center gap-3 hover:bg-slate-700/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-slate-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-white">Sign Out</p>
                <p className="text-sm text-slate-500">
                  Log out of your account
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-red-400 uppercase tracking-wider px-1">
            Danger Zone
          </h3>
          <div className="bg-red-500/10 rounded-2xl border border-red-500/30">
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-red-400">Delete Account</p>
                <p className="text-sm text-red-400/60">
                  Permanently delete your account and data
                </p>
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Change Password</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter a new password for your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {passwordError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {passwordError}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-slate-300">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={passwordChanging}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {passwordChanging ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Update Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              This action cannot be undone. All your data will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-slate-300">Type DELETE to confirm</Label>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="mt-2 bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== "DELETE" || deleting}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
