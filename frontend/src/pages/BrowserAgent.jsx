import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Terminal, Globe, CheckCircle, AlertCircle, ArrowLeft, 
  Settings, Key, Layers, Lock, RefreshCw, ExternalLink, Loader2, Sparkles
} from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { getTodayIST } from '../utils/dateUtils';

const BrowserAgent = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Form State
  const [sourceUrl, setSourceUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('https://www.fusionstays.com/admin/account/');
  const [email, setEmail] = useState('admin@fusionstays.com');
  const [password, setPassword] = useState('securepassword123');
  const [instructions, setInstructions] = useState('');
  const [useMock, setUseMock] = useState(true);

  // Job Status State
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null); // 'queued', 'running', 'completed', 'failed'
  const [jobSteps, setJobSteps] = useState([]);
  const [currentUrl, setCurrentUrl] = useState('about:blank');
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPollerRunning, setIsPollerRunning] = useState(false);
  const [recentJobs, setRecentJobs] = useState([]);

  // Final Save Form (After Extraction)
  const [reviewForm, setReviewForm] = useState({
    parent: 'Coorg',
    points: 0,
    name: '',
    displayName: '',
    pageTitle: '',
    displayMetaTitle: '',
    metaDescription: '',
    displayMetaDescription: '',
    amenities: []
  });
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const consoleEndRef = useRef(null);

  // Load recent jobs
  const fetchRecentJobs = async () => {
    try {
      const { data } = await api.get('/agent/jobs');
      setRecentJobs(data || []);
    } catch (err) {
      console.error("Failed to load recent jobs", err);
    }
  };

  useEffect(() => {
    fetchRecentJobs();
  }, []);

  // Poll job status
  useEffect(() => {
    let intervalId = null;

    if (activeJobId && isPollerRunning) {
      intervalId = setInterval(async () => {
        try {
          const { data } = await api.get(`/agent/status/${activeJobId}`);
          setJobStatus(data.status);
          setJobSteps(data.steps || []);
          setExtractedData(data.extractedData);
          setErrorMsg(data.error || '');

          // Get the last step to update viewport
          if (data.steps && data.steps.length > 0) {
            const lastStep = data.steps[data.steps.length - 1];
            if (lastStep.screenshot) {
              setCurrentScreenshot(lastStep.screenshot);
            }
            if (lastStep.url) {
              setCurrentUrl(lastStep.url);
            }
          }

          // Auto-scroll terminal
          if (consoleEndRef.current) {
            consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }

          // Check if finished
          if (data.status === 'completed' || data.status === 'failed') {
            setIsPollerRunning(false);
            fetchRecentJobs();
            
            if (data.status === 'completed' && data.extractedData) {
              // Pre-fill review form
              setReviewForm({
                parent: data.extractedData.parent || 'Coorg',
                points: data.extractedData.points || 0,
                name: data.extractedData.name || '',
                displayName: data.extractedData.displayName || '',
                pageTitle: data.extractedData.pageTitle || '',
                displayMetaTitle: data.extractedData.displayMetaTitle || '',
                metaDescription: data.extractedData.metaDescription || '',
                displayMetaDescription: data.extractedData.displayMetaDescription || '',
                amenities: data.extractedData.amenities || []
              });
            }
          }
        } catch (err) {
          console.error("Polling status failed:", err);
          setIsPollerRunning(false);
        }
      }, 1500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeJobId, isPollerRunning]);

  // Start Agent run
  const handleLaunchAgent = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setExtractedData(null);
    setSaveSuccess(false);
    setJobSteps([]);
    setCurrentScreenshot(null);
    setCurrentUrl('about:blank');

    try {
      const payload = {
        sourceUrl: sourceUrl.trim() || undefined,
        targetUrl: targetUrl.trim(),
        email: email.trim(),
        password: password.trim(),
        instructions: instructions.trim() || undefined,
        mock: useMock
      };

      const { data } = await api.post('/agent/run', payload);
      setActiveJobId(data.id);
      setJobStatus(data.status);
      setIsPollerRunning(true);
    } catch (err) {
      console.error("Failed to start agent:", err);
      setErrorMsg(err.response?.data?.message || "Connection error. Make sure your credentials and portal inputs are correct.");
    }
  };

  // Submit final property details to properties database
  const handleSaveToPropertiesDb = async (e) => {
    e.preventDefault();
    setIsSavingToDb(true);
    setSaveSuccess(false);

    try {
      // Map review form to properties record schema
      const recordPayload = {
        "Date of Entry": getTodayIST(),
        "Name of Person": "AI Browser Agent",
        "Name of property": reviewForm.name,
        "Location": reviewForm.parent,
        "Phone Number": "",
        "Source": sourceUrl ? new URL(sourceUrl).hostname.replace('www.', '') : "AI Scraped",
        "Reason to List": `Scraped from: ${sourceUrl || 'Custom Instruction'}`,
        "Status": "In draft",
        "Remarks": `Auto-generated. Page Title: ${reviewForm.pageTitle}. Amenities: ${reviewForm.amenities.join(', ')}`,
        "Details": reviewForm.metaDescription
      };

      await api.post('/records', recordPayload);
      setSaveSuccess(true);
      fetchRecentJobs();
    } catch (err) {
      console.error("Failed to save property to database:", err);
      alert("Failed to save property. Please check backend connections.");
    } finally {
      setIsSavingToDb(false);
    }
  };

  // Preset selectors for quick fill
  const handleUseAirbnbPreset = () => {
    setSourceUrl('https://www.airbnb.com/rooms/856427389146');
    setInstructions('Extract the listing description, set location to Coorg, and select bonfire and organic farming.');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 z-10 py-4 px-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">AI Browser Automation Agent</h1>
              <span className="bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Agent Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Scrape web properties and automatically populate your real FusionStays backend.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">{user?.email}</span>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Side Config Form & Results */}
        <div className="lg:col-span-5 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Main Configuration Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-4 h-4 text-brand-600" /> Automation Setup
            </h2>
            
            <form onSubmit={handleLaunchAgent} className="space-y-4">
              {/* Credentials Preset Option */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-slate-400" /> Portal Credentials</span>
                <button 
                  type="button"
                  onClick={() => {
                    setEmail('shubhra@workspace.com');
                    setPassword('securepassword123');
                  }}
                  className="text-brand-600 font-bold hover:underline"
                >
                  Use preset
                </button>
              </div>

              {/* Source Property URL */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Source listing URL (optional)</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    placeholder="e.g. Airbnb listing URL to extract details"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleUseAirbnbPreset}
                  className="text-[10px] text-indigo-600 font-semibold hover:underline mt-1.5 block"
                >
                  💡 Load Coorg Estate cottage demo preset
                </button>
              </div>

              {/* Credentials inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Admin Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              {/* Target Portal URL */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Portal URL</label>
                <input
                  type="url"
                  required
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-xs"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custom Instructions / Settings</label>
                <textarea
                  placeholder="e.g. Set parent to Coorg, points to 15, and check Geyser and Television amenities."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows="3"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Mode Toggles */}
              <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-indigo-900">Mock Automation Mode</span>
                  <span className="text-[10px] text-indigo-600 font-medium">Safe simulation without real login</span>
                </div>
                <input
                  type="checkbox"
                  checked={useMock}
                  onChange={(e) => setUseMock(e.target.checked)}
                  className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 cursor-pointer"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isPollerRunning}
                className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-brand-100 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isPollerRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Agent Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Start Browser Agent</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Job Error / Status Notification */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <div>
                <span className="font-bold">Error executing job:</span>
                <p className="mt-0.5 text-xs text-red-600">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Extracted Details & Review Section */}
          {extractedData && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg p-5 space-y-4 animate-slide-up">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" /> Review Scraped Details
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Scrape Success</span>
              </div>

              {saveSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">Property Saved!</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">The property has been successfully added as a draft to the local Properties Database.</p>
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="text-xs text-brand-600 font-bold hover:underline"
                  >
                    View in Database Dashboard &rarr;
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveToPropertiesDb} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Parent Location</label>
                      <input
                        type="text"
                        value={reviewForm.parent}
                        onChange={(e) => setReviewForm({...reviewForm, parent: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Points</label>
                      <input
                        type="number"
                        value={reviewForm.points}
                        onChange={(e) => setReviewForm({...reviewForm, points: Number(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Name</label>
                    <input
                      type="text"
                      required
                      value={reviewForm.name}
                      onChange={(e) => setReviewForm({...reviewForm, name: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Display Name</label>
                    <input
                      type="text"
                      required
                      value={reviewForm.displayName}
                      onChange={(e) => setReviewForm({...reviewForm, displayName: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Page Title</label>
                    <input
                      type="text"
                      value={reviewForm.pageTitle}
                      onChange={(e) => setReviewForm({...reviewForm, pageTitle: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Meta Description</label>
                    <textarea
                      value={reviewForm.metaDescription}
                      onChange={(e) => setReviewForm({...reviewForm, metaDescription: e.target.value})}
                      rows="2"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Extracted Amenities</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {reviewForm.amenities.map(amenity => (
                        <span key={amenity} className="bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-indigo-100">
                          {amenity}
                        </span>
                      ))}
                      {reviewForm.amenities.length === 0 && <span className="text-xs text-slate-400 italic">None found</span>}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingToDb}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md hover:shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                  >
                    {isSavingToDb ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save to Local Properties DB</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Recent Jobs History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Automation Runs</h3>
            <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
              {recentJobs.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No historical jobs found.</p>
              ) : (
                recentJobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => {
                      setActiveJobId(job.id);
                      setJobStatus(job.status);
                      setJobSteps(job.steps || []);
                      setExtractedData(job.extractedData);
                      setErrorMsg(job.error || '');
                      setIsPollerRunning(false);
                      if (job.steps && job.steps.length > 0) {
                        const lastStep = job.steps[job.steps.length - 1];
                        setCurrentScreenshot(lastStep.screenshot);
                        setCurrentUrl(lastStep.url || 'about:blank');
                      }
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 transition-all text-left text-xs"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-700 truncate max-w-[180px]">
                        {job.extractedData?.name || job.id}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(job.created).toLocaleString([], { hour: '2-digit', minute: '2-digit' })} — {job.steps.length} steps
                      </span>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                      job.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      job.status === 'failed' ? 'bg-rose-50 text-rose-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {job.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
          
        </div>

        {/* Right Side Terminal Console & Viewport */}
        <div className="lg:col-span-7 flex flex-col h-[calc(100vh-140px)] gap-6">
          
          {/* Simulated Web Viewport */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {/* Viewport header */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
              {/* Close/Min/Max Dots */}
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              </div>
              
              {/* Address bar */}
              <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center gap-2 text-xs text-slate-500 overflow-hidden shadow-inner">
                <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate select-all">{currentUrl}</span>
              </div>
              
              <RefreshCw className={`w-4 h-4 text-slate-400 ${isPollerRunning ? 'animate-spin' : ''}`} />
            </div>

            {/* Viewport Screen content */}
            <div className="flex-1 bg-slate-800 relative flex items-center justify-center p-2 overflow-auto">
              {currentScreenshot ? (
                <img 
                  src={currentScreenshot} 
                  alt="Live Agent Web Viewport" 
                  className="max-w-full max-h-full object-contain rounded-md shadow-lg border border-slate-700 animate-fade-in"
                />
              ) : (
                <div className="text-center space-y-3 p-6 max-w-sm">
                  <div className="w-16 h-16 bg-slate-750 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto text-slate-500 shadow-inner">
                    <Globe className="w-8 h-8 animate-pulse text-brand-500" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-350">Browser Viewport Standby</h4>
                  <p className="text-xs text-slate-500">Launch the agent to initialize Puppeteer browser. A real-time visual feed of the automation will render here.</p>
                </div>
              )}

              {/* Shimmer Overlay during load */}
              {isPollerRunning && !currentScreenshot && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                  <span className="text-xs text-white font-semibold tracking-wide">Starting headless session...</span>
                </div>
              )}
            </div>
          </div>

          {/* Terminal Console */}
          <div className="h-[200px] bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden font-mono text-xs text-slate-350">
            {/* Terminal header */}
            <div className="bg-slate-900 border-b border-slate-855 px-4 py-2 flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-2 font-bold"><Terminal className="w-3.5 h-3.5 text-brand-500" /> AGENT LOGSTREAM</span>
              {jobStatus && (
                <span className="flex items-center gap-1.5 text-[10px]">
                  <span className={`w-2 h-2 rounded-full ${isPollerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                  <span className="uppercase font-extrabold">{jobStatus}</span>
                </span>
              )}
            </div>

            {/* Terminal log logs */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar">
              {jobSteps.length === 0 ? (
                <div className="text-slate-600 italic">No logs generated. Setup parameters and hit start.</div>
              ) : (
                jobSteps.map((step, idx) => (
                  <div key={idx} className="space-y-1 border-l border-slate-800 pl-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600">[{new Date(step.timestamp).toLocaleTimeString()}]</span>
                      <span className="text-amber-500 font-bold">Thought:</span>
                      <span className="text-slate-200">{step.thought}</span>
                    </div>
                    {step.action && (
                      <div className="pl-4 flex items-center gap-2">
                        <span className="text-emerald-500 font-bold">Action &gt;</span>
                        <span className="text-slate-400">{step.action}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default BrowserAgent;
