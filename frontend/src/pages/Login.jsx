import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const result = await login(email, password);
    
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
      <div className="z-10 w-full max-w-5xl backdrop-blur-md bg-white/10 border border-white/30 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden animate-fade-in">
        
        {/* Top Glass Navbar */}
        <div className="w-full border border-white/30 rounded-full px-4 sm:px-6 py-2.5 bg-white/10 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="bg-teal-500/40 border border-white/30 text-white rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium backdrop-blur-sm transition-all hover:bg-teal-500/50">
              Home
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="bg-teal-500/40 border border-white/30 text-white rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium backdrop-blur-sm transition-all hover:bg-teal-500/50">
              Log in
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mt-8 sm:mt-12 mb-4">
          
          {/* Left Hero Text */}
          <div className="lg:col-span-6 text-white space-y-3 px-2 sm:px-4 text-center lg:text-left">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight drop-shadow-lg leading-tight font-sans">
              FusionStays
            </h1>
            <p className="text-xl sm:text-2xl italic font-serif text-teal-100/90 drop-shadow-md">
              Property Addition
            </p>
          </div>

          {/* Right Glass Login Box */}
          <div className="lg:col-span-6">
            <div className="backdrop-blur-2xl bg-teal-950/40 border border-white/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
              
              {/* Header Title */}
              <div className="mb-8 border-b border-white/20 pb-3">
                <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-white">
                  Log in
                </h2>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-rose-500/20 border border-rose-400/50 text-rose-100 text-xs rounded-2xl p-3 animate-fade-in text-center backdrop-blur-sm">
                    {error}
                  </div>
                )}

                {/* Email / Username Input */}
                <div className="relative group">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/15 border border-white/30 rounded-2xl py-3.5 px-5 pr-12 text-white placeholder-white/70 backdrop-blur-md focus:outline-none focus:bg-white/25 focus:border-white transition-all text-sm"
                    placeholder="Enter username"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 pointer-events-none">
                    <User className="w-5 h-5" />
                  </div>
                </div>

                {/* Password Input */}
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/15 border border-white/30 rounded-2xl py-3.5 px-5 pr-12 text-white placeholder-white/70 backdrop-blur-md focus:outline-none focus:bg-white/25 focus:border-white transition-all text-sm"
                    placeholder="Enter password"
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

                {/* Submit Button */}
                <div className="pt-2 text-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-full py-3.5 px-10 shadow-lg shadow-emerald-950/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 min-w-[140px] text-base"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                    ) : (
                      'Log in'
                    )}
                  </button>
                </div>

                {/* Forgot Password Link */}
                <div className="text-right pt-1">
                  <button
                    type="button"
                    onClick={() => alert('Please contact system administrator to reset password.')}
                    className="text-xs text-white/70 hover:text-white transition-colors focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>

              </form>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Login;
