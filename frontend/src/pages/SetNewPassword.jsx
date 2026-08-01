import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock, Eye, EyeOff, ShieldAlert, LogOut } from 'lucide-react';

const SetNewPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resetPassword, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    const result = await resetPassword(newPassword);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 bg-cover bg-center bg-no-repeat font-sans overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.35), rgba(15, 23, 42, 0.45)), url('/login_bg_resort.png')`
      }}
    >
      {/* Outer Main Glass Container */}
      <div className="z-10 w-full max-w-xl backdrop-blur-md bg-white/10 border border-white/30 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden animate-fade-in">
        
        {/* Top Glass Navbar */}
        <div className="w-full border border-white/30 rounded-full px-4 sm:px-6 py-2.5 bg-white/10 backdrop-blur-md flex items-center justify-between shadow-sm mb-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span className="text-white font-medium text-sm">Security Update</span>
          </div>
          
          <button 
            onClick={logout}
            className="bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-full px-3.5 py-1 text-xs font-medium backdrop-blur-sm transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log out
          </button>
        </div>

        {/* Right Glass Box */}
        <div className="backdrop-blur-2xl bg-red-950/40 border border-white/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          
          {/* Header Title */}
          <div className="mb-6 border-b border-white/20 pb-3 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-white">
              Set New Password
            </h2>
            <p className="text-xs sm:text-sm text-white/80 mt-1">
              For security reasons, you must change your password before continuing to FusionStays.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-rose-500/20 border border-rose-400/50 text-rose-100 text-xs rounded-2xl p-3 animate-fade-in text-center backdrop-blur-sm">
                {error}
              </div>
            )}

            {/* New Password Input */}
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/15 border border-white/30 rounded-2xl py-3.5 px-5 pr-12 text-white placeholder-white/70 backdrop-blur-md focus:outline-none focus:bg-white/25 focus:border-white transition-all text-sm"
                placeholder="Enter new password (min. 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </button>
            </div>

            {/* Confirm Password Input */}
            <div className="relative group">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/15 border border-white/30 rounded-2xl py-3.5 px-5 pr-12 text-white placeholder-white/70 backdrop-blur-md focus:outline-none focus:bg-white/25 focus:border-white transition-all text-sm"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
                title={showConfirmPassword ? "Hide Password" : "Show Password"}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </button>
            </div>

            {/* Submit Button */}
            <div className="pt-2 text-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-500 text-white font-bold rounded-full py-3.5 px-8 shadow-lg shadow-red-950/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 w-full text-base"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                ) : (
                  'Update Password & Continue'
                )}
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};

export default SetNewPassword;
