'use client';

import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import {
  X,
  Sparkles,
  MapPin,
  Compass,
  Navigation,
  Upload,
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Search,
  Globe2,
  Copy,
  ExternalLink,
  QrCode,
  Clock,
} from 'lucide-react';
import QRCode from 'qrcode';
import { LightMarkerData } from '@/types';
import { isProductionMode } from '@/config/appMode';

interface AddYourLightFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPickingOnGlobe: () => void;
  pickedCoordinates: { lat: number; lng: number } | null;
  onConfirmContribution: (newMarker: LightMarkerData) => void;
}

const PRESET_AMOUNTS = [10, 25, 35, 55, 100];

// Defined representative points for countries and regions (clearly labelled as approximate)
const COUNTRIES_AND_REGIONS = [
  { name: 'India', region: 'South Asia', lat: 20.5937, lng: 78.9629 },
  { name: 'United States', region: 'North America', lat: 37.0902, lng: -95.7129 },
  { name: 'United Kingdom', region: 'Europe', lat: 55.3781, lng: -3.4360 },
  { name: 'Japan', region: 'East Asia', lat: 36.2048, lng: 138.2529 },
  { name: 'Australia', region: 'Oceania', lat: -25.2744, lng: 133.7751 },
  { name: 'Brazil', region: 'South America', lat: -14.2350, lng: -51.9253 },
  { name: 'Germany', region: 'Europe', lat: 51.1657, lng: 10.4515 },
  { name: 'France', region: 'Europe', lat: 46.2276, lng: 2.2137 },
  { name: 'Canada', region: 'North America', lat: 56.1304, lng: -106.3468 },
  { name: 'South Africa', region: 'Africa', lat: -30.5595, lng: 22.9375 },
  { name: 'Singapore', region: 'Southeast Asia', lat: 1.3521, lng: 103.8198 },
  { name: 'United Arab Emirates', region: 'Middle East', lat: 23.4241, lng: 53.8478 },
  { name: 'Kenya', region: 'East Africa', lat: -0.0236, lng: 37.9062 },
  { name: 'Argentina', region: 'South America', lat: -38.4161, lng: -63.6167 },
  { name: 'Switzerland', region: 'Europe', lat: 46.8182, lng: 8.2275 },
  { name: 'Egypt', region: 'North Africa', lat: 26.8206, lng: 30.8025 },
  { name: 'Iceland', region: 'Nordics', lat: 64.9631, lng: -19.0208 },
  { name: 'South Korea', region: 'East Asia', lat: 35.9078, lng: 127.7669 },
  { name: 'Sweden', region: 'Scandinavia', lat: 60.1282, lng: 18.6435 },
  { name: 'New Zealand', region: 'Oceania', lat: -40.9006, lng: 174.8860 },
];

interface UpiOrderDetails {
  orderId: string;
  amount: number;
  currency: string;
  payeeVpa: string;
  payeeName: string;
  upiUri: string;
  isConfigured: boolean;
  isDemo: boolean;
  verificationNotice: string;
}

export default function AddYourLightFlow({
  isOpen,
  onClose,
  onStartPickingOnGlobe,
  pickedCoordinates,
}: AddYourLightFlowProps) {
  const isProduction = isProductionMode();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [amount, setAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customAmountError, setCustomAmountError] = useState<string | null>(null);

  // Location selection state
  const [locationMode, setLocationMode] = useState<'country' | 'globe' | 'device'>('country');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES_AND_REGIONS[0]);
  const [countrySearch, setCountrySearch] = useState('');
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Personalization state
  const [name, setName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // UPI QR checkout state
  const [isGeneratingIntent, setIsGeneratingIntent] = useState(false);
  const [orderData, setOrderData] = useState<UpiOrderDetails | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [claimedUtr, setClaimedUtr] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [isVerificationSubmitted, setIsVerificationSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Escape key closes flow
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // If user picked coordinates on globe, switch mode to globe and step to 2
  useEffect(() => {
    if (pickedCoordinates) {
      setLocationMode('globe');
      setStep(2);
    }
  }, [pickedCoordinates]);

  // Active contribution calculation
  const parsedCustom = parseFloat(customAmount);
  const currentAmount = customAmount ? (isNaN(parsedCustom) ? 0 : parsedCustom) : amount;
  const isAmountValid = currentAmount >= 10 && currentAmount <= 1000000 && Number.isInteger(currentAmount);

  const handleCustomAmountChange = (val: string) => {
    setCustomAmount(val);
    const num = parseFloat(val);
    if (!val) {
      setCustomAmountError(null);
    } else if (isNaN(num) || num < 10) {
      setCustomAmountError('Minimum contribution is ₹10');
    } else if (num > 1000000) {
      setCustomAmountError('Maximum contribution is ₹10,00,000');
    } else if (!Number.isInteger(num)) {
      setCustomAmountError('Please enter a whole integer amount in Rupees');
    } else {
      setCustomAmountError(null);
    }
  };

  // Request browser geolocation on explicit user click
  const handleRequestDeviceLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setDeviceCoords({
          lat: Number(latitude.toFixed(4)),
          lng: Number(longitude.toFixed(4)),
        });
        setLocationMode('device');
      },
      (err) => {
        setIsLocating(false);
        setGeoError(err.message || 'Location permission was denied or is currently unavailable.');
      },
      { timeout: 10000 }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Resolve final active latitude, longitude, and descriptive label
  let activeLat = selectedCountry.lat;
  let activeLng = selectedCountry.lng;
  let locationLabel = `${selectedCountry.name}`;
  let isApproximate = true;

  if (locationMode === 'globe' && pickedCoordinates) {
    activeLat = pickedCoordinates.lat;
    activeLng = pickedCoordinates.lng;
    locationLabel = `Custom Point (${pickedCoordinates.lat.toFixed(2)}°, ${pickedCoordinates.lng.toFixed(2)}°)`;
    isApproximate = false;
  } else if (locationMode === 'device' && deviceCoords) {
    activeLat = deviceCoords.lat;
    activeLng = deviceCoords.lng;
    locationLabel = `Current Location (${deviceCoords.lat.toFixed(2)}°, ${deviceCoords.lng.toFixed(2)}°)`;
    isApproximate = false;
  }

  // Generates unique server-side UPI QR checkout session
  const initializeUpiCheckout = useCallback(async () => {
    setIsGeneratingIntent(true);
    setSubmissionError(null);
    setOrderData(null);
    setQrCodeDataUrl(null);
    setIsVerificationSubmitted(false);

    const contributorName = isAnonymous ? 'Anonymous' : (name.trim() || 'A Kind Soul');
    const payload = {
      amount: currentAmount,
      currency: 'INR',
      name: contributorName,
      isAnonymous,
      message: message.trim() || undefined,
      lat: activeLat,
      lng: activeLng,
      isApproximate,
      city: locationMode === 'country' ? selectedCountry.region : 'Earth Coordinates',
      country: locationMode === 'country' ? selectedCountry.name : 'Global',
      photoUrl: photoPreview || undefined,
    };

    try {
      const res = await fetch('/api/contributions/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setSubmissionError(result.error || 'Failed to initialize payment checkout.');
        setIsGeneratingIntent(false);
        return;
      }

      const upiUri = result.upiUri || '';
      const orderDetails: UpiOrderDetails = {
        orderId: result.orderId,
        amount: result.amount,
        currency: result.currency || 'INR',
        payeeVpa: result.payeeVpa || 'demo@upi',
        payeeName: result.payeeName || 'WorldBeacon Demo',
        upiUri,
        isConfigured: Boolean(result.isConfigured),
        isDemo: Boolean(result.isDemo),
        verificationNotice:
          result.verificationNotice ||
          'Manual verification required. Your light will be activated on the globe after administrative verification.',
      };

      setOrderData(orderDetails);

      // Generate high-resolution QR code locally
      if (upiUri) {
        const qrUrl = await QRCode.toDataURL(upiUri, {
          width: 240,
          margin: 1,
          color: {
            dark: '#030407',
            light: '#FFFFFF',
          },
        });
        setQrCodeDataUrl(qrUrl);
      }

      setStep(4);
    } catch (err: any) {
      setSubmissionError(err.message || 'Unable to connect to payment service. Please try again.');
    } finally {
      setIsGeneratingIntent(false);
    }
  }, [
    isAnonymous,
    name,
    currentAmount,
    message,
    activeLat,
    activeLng,
    isApproximate,
    locationMode,
    selectedCountry.region,
    selectedCountry.name,
    photoPreview,
  ]);

  // Visitor submits "I've Paid" with optional UTR
  const handleSubmitVerification = async () => {
    if (!orderData || isSubmittingVerification) return;
    setIsSubmittingVerification(true);
    setSubmissionError(null);

    try {
      const res = await fetch('/api/contributions/submit-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.orderId,
          transactionRef: claimedUtr.trim() || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setSubmissionError(result.error || 'Failed to submit verification request.');
        setIsSubmittingVerification(false);
        return;
      }

      setIsVerificationSubmitted(true);
    } catch (err: any) {
      setSubmissionError(err.message || 'Error submitting verification. Please check your network.');
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredCountries = COUNTRIES_AND_REGIONS.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.region.toLowerCase().includes(countrySearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-3xl glass-modal p-6 sm:p-8 overflow-hidden border border-white/15 shadow-[0_0_80px_rgba(0,0,0,0.9)] max-h-[92vh] flex flex-col justify-between"
      >
        {/* Top close button & progress indicator */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FFC857] shadow-[0_0_8px_#FFC857]" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#8993A7] font-mono">
              Step {step} of 4 — {step === 1 && 'Amount'}
              {step === 2 && 'Location'}
              {step === 3 && 'Personalize'}
              {step === 4 && (isVerificationSubmitted ? 'Status' : 'UPI QR Checkout')}
            </span>
          </div>

          <button
            id="btn-close-flow"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8993A7] hover:text-[#F5F7FA] hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ================= STEP 1: AMOUNT SELECTION ================= */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in flex-1 overflow-y-auto pr-1">
            <div>
              <h2 id={titleId} className="text-2xl sm:text-3xl font-light text-[#F5F7FA] tracking-tight mb-1">
                ADD YOUR LIGHT
              </h2>
              <p className="text-xs sm:text-sm text-[#8993A7] font-light">
                Every light tells a story. Choose your contribution.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  id={`btn-preset-${val}`}
                  onClick={() => {
                    setAmount(val);
                    setCustomAmount('');
                    setCustomAmountError(null);
                  }}
                  className={`py-3.5 rounded-2xl font-mono text-sm sm:text-base font-medium transition-all cursor-pointer ${
                    amount === val && !customAmount
                      ? 'btn-gold shadow-[0_0_20px_rgba(255,200,87,0.35)]'
                      : 'bg-white/[0.04] text-[#F5F7FA] border border-white/10 hover:border-white/25 hover:bg-white/[0.08]'
                  }`}
                >
                  ₹{val}
                </button>
              ))}

              <div className="col-span-3 sm:col-span-1">
                <input
                  type="number"
                  placeholder="Custom ₹"
                  min="10"
                  max="1000000"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className={`w-full py-3.5 px-3.5 rounded-2xl font-mono text-sm bg-white/[0.04] text-[#F5F7FA] border transition-all placeholder:text-[#8993A7]/50 focus:outline-none ${
                    customAmount
                      ? customAmountError
                        ? 'border-red-400 text-red-300'
                        : 'border-[#FFC857] text-[#FFC857]'
                      : 'border-white/10 focus:border-[#FFC857]/60'
                  }`}
                />
              </div>
            </div>

            {customAmountError && (
              <p className="text-xs text-red-400 font-mono flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{customAmountError}</span>
              </p>
            )}

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2.5 text-xs text-[#8993A7]">
              <QrCode className="w-4 h-4 text-[#FFC857] shrink-0" />
              <span>Payments processed via direct UPI QR with manual administrative verification.</span>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                id="btn-continue-step-1"
                disabled={!isAmountValid}
                onClick={() => setStep(2)}
                className={`btn-gold px-7 py-3 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-2 cursor-pointer shadow-lg transition-opacity ${
                  !isAmountValid ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <span>CONTINUE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: LOCATION SELECTION ================= */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in flex-1 overflow-y-auto pr-1">
            <div>
              <h2 id={titleId} className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight mb-1">
                WHERE WILL YOUR LIGHT SHINE?
              </h2>
              <p className="text-xs sm:text-sm text-[#8993A7] font-light">
                Anchor your light to our living planet.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Choice 1: Select location on interactive globe */}
              <button
                type="button"
                id="btn-select-globe"
                onClick={() => {
                  setLocationMode('globe');
                  onStartPickingOnGlobe();
                }}
                className={`w-full py-3 px-4 rounded-2xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                  locationMode === 'globe'
                    ? 'border-[#FFC857] bg-[#FFC857]/10 text-[#FFC857]'
                    : 'border-white/10 bg-white/[0.03] text-[#F5F7FA] hover:border-white/25 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FFC857]/15 border border-[#FFC857]/30 flex items-center justify-center text-[#FFC857] shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-medium">Select a location on the interactive globe</div>
                    <div className="text-[11px] text-[#8993A7] font-mono">
                      {pickedCoordinates
                        ? `Selected: ${pickedCoordinates.lat.toFixed(2)}°, ${pickedCoordinates.lng.toFixed(2)}° (precise)`
                        : 'Click anywhere directly on Earth'}
                    </div>
                  </div>
                </div>
                {pickedCoordinates && <Check className="w-4 h-4 text-[#FFC857] shrink-0" />}
              </button>

              {/* Choice 2: Use current location */}
              <div
                className={`w-full p-3.5 rounded-2xl border transition-all ${
                  locationMode === 'device'
                    ? 'border-[#7DD3FC] bg-[#7DD3FC]/10'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#7DD3FC]/15 border border-[#7DD3FC]/30 flex items-center justify-center text-[#7DD3FC] shrink-0">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-medium text-[#F5F7FA]">Use my current location</div>
                      <div className="text-[11px] text-[#8993A7]">
                        Requests browser location once to place your beacon. Never stored permanently.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    id="btn-use-device-location"
                    onClick={handleRequestDeviceLocation}
                    disabled={isLocating}
                    className="ml-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-[#7DD3FC] font-medium transition-colors shrink-0 cursor-pointer"
                  >
                    {isLocating ? 'Locating...' : deviceCoords ? 'Update' : 'Locate'}
                  </button>
                </div>
                {deviceCoords && (
                  <div className="mt-2 text-[11px] font-mono text-[#7DD3FC] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Coordinates detected: {deviceCoords.lat.toFixed(2)}°, {deviceCoords.lng.toFixed(2)}° (precise)</span>
                  </div>
                )}
                {geoError && (
                  <div className="mt-2 text-xs text-red-400 font-mono flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{geoError}</span>
                  </div>
                )}
              </div>

              {/* Choice 3: Choose a country or region */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  locationMode === 'country'
                    ? 'border-white/25 bg-white/[0.05]'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-[#8993A7] font-mono flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-[#FFC857]" />
                    <span>Choose a country or region</span>
                  </span>
                  <span className="text-[10px] text-[#8993A7] font-mono">
                    Representative point (approximate)
                  </span>
                </div>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-[#8993A7] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search country..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="w-full py-1.5 pl-8 pr-3 rounded-lg bg-black/40 text-xs text-[#F5F7FA] border border-white/10 focus:outline-none focus:border-[#FFC857]"
                  />
                </div>

                <select
                  id="select-country"
                  value={selectedCountry.name}
                  onChange={(e) => {
                    const found = COUNTRIES_AND_REGIONS.find((c) => c.name === e.target.value);
                    if (found) {
                      setSelectedCountry(found);
                      setLocationMode('country');
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#080D18] text-[#F5F7FA] text-xs sm:text-sm border border-white/15 focus:outline-none focus:border-[#FFC857] cursor-pointer"
                >
                  {filteredCountries.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} — {c.region} (approximate)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center shrink-0">
              <button
                type="button"
                id="btn-back-step-2"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs text-[#8993A7] hover:text-[#F5F7FA] flex items-center gap-1.5 cursor-pointer font-mono"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK</span>
              </button>
              <button
                type="button"
                id="btn-continue-step-2"
                onClick={() => setStep(3)}
                className="btn-gold px-7 py-3 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>CONTINUE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PERSONALIZE ================= */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in flex-1 overflow-y-auto pr-1">
            <div>
              <h2 id={titleId} className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight mb-1">
                MAKE IT YOURS
              </h2>
              <p className="text-xs sm:text-sm text-[#8993A7] font-light">
                Dedicate this light to someone, share a memory, or leave a message for humanity.
              </p>
            </div>

            {/* Compact Amount & Location Preview */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs font-mono">
              <span className="text-[#8993A7]">Selected:</span>
              <span className="text-[#FFC857] font-semibold">₹{currentAmount.toLocaleString()}</span>
              <span className="text-[#8993A7]">•</span>
              <span className="text-[#7DD3FC] truncate max-w-[180px]">{locationLabel}</span>
              <span className="text-[10px] text-[#8993A7]">({isApproximate ? 'approx' : 'precise'})</span>
            </div>

            {/* Name / Anonymous Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase tracking-wider text-[#8993A7] font-mono">
                  Display Name (Optional)
                </label>
                <label className="flex items-center gap-1.5 text-xs text-[#8993A7] hover:text-[#F5F7FA] cursor-pointer">
                  <input
                    type="checkbox"
                    id="checkbox-anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="accent-[#FFC857] rounded cursor-pointer"
                  />
                  <span>Contribute anonymously</span>
                </label>
              </div>
              <input
                type="text"
                id="input-contributor-name"
                disabled={isAnonymous}
                placeholder={isAnonymous ? 'Anonymous' : 'e.g. Alex Morgan or The Morgan Family'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full py-2.5 px-3.5 rounded-2xl bg-white/[0.04] text-[#F5F7FA] border border-white/10 text-sm focus:outline-none focus:border-[#FFC857] disabled:opacity-40"
              />
            </div>

            {/* Dedication Message */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#8993A7] font-mono mb-1.5">
                Dedication Message (Optional)
              </label>
              <textarea
                id="textarea-dedication"
                rows={3}
                placeholder="In memory of... For peace... To our future..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={240}
                className="w-full py-2.5 px-3.5 rounded-2xl bg-white/[0.04] text-[#F5F7FA] border border-white/10 text-sm focus:outline-none focus:border-[#FFC857] resize-none"
              />
              <div className="text-right text-[10px] text-[#8993A7] font-mono mt-0.5">
                {message.length} / 240
              </div>
            </div>

            {/* Optional Photo Upload UI */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#8993A7] font-mono mb-1.5">
                Optional Avatar / Tribute Image
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 py-2.5 px-3.5 rounded-2xl border border-dashed border-white/20 hover:border-[#FFC857]/50 bg-white/[0.02] flex items-center justify-center gap-2 cursor-pointer text-xs text-[#8993A7] hover:text-[#F5F7FA] transition-colors">
                  <Upload className="w-4 h-4 text-[#FFC857]" />
                  <span>{photoPreview ? 'Change Photo' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {photoPreview && (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#FFC857] shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {submissionError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submissionError}</span>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center shrink-0">
              <button
                type="button"
                id="btn-back-step-3"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs text-[#8993A7] hover:text-[#F5F7FA] flex items-center gap-1.5 cursor-pointer font-mono"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK</span>
              </button>
              <button
                type="button"
                id="btn-continue-step-3"
                disabled={isGeneratingIntent}
                onClick={initializeUpiCheckout}
                className="btn-gold px-7 py-3 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                <span>{isGeneratingIntent ? 'GENERATING UPI QR...' : 'PROCEED TO CHECKOUT'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: UPI QR CHECKOUT & MANUAL VERIFICATION ================= */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in flex-1 overflow-y-auto pr-1">
            {isVerificationSubmitted ? (
              /* Screen 4B: Verification Request Submitted */
              <div className="space-y-4 py-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <Clock className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight">
                    VERIFICATION REQUEST SUBMITTED
                  </h2>
                  <p className="text-xs text-[#8993A7] font-mono">
                    Order Reference: <span className="text-[#FFC857]">{orderData?.orderId}</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-[#8993A7]">Contribution Amount:</span>
                    <span className="text-[#FFC857] font-bold">₹{orderData?.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-[#8993A7]">Claimed Transaction ID:</span>
                    <span className="text-[#7DD3FC]">{claimedUtr || 'None provided'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#8993A7]">Review Status:</span>
                    <span className="text-amber-300 font-semibold uppercase">Pending Manual Review</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed text-left">
                  <span className="font-semibold block mb-1">What happens next?</span>
                  Our operator will independently verify this payment against official bank account records. Once confirmed, your beacon will be activated and permanently ignite on the global monument.
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-gold px-8 py-3 rounded-full text-xs font-semibold uppercase tracking-widest cursor-pointer shadow-lg"
                  >
                    <span>DONE & RETURN TO GLOBE</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Screen 4A: Active UPI QR Payment Checkout */
              <div className="space-y-4">
                <div>
                  <h2 id={titleId} className="text-xl sm:text-2xl font-light text-[#F5F7FA] tracking-tight mb-1">
                    PAY VIA UPI QR
                  </h2>
                  <p className="text-xs text-[#8993A7] font-light">
                    Scan with any UPI app (Google Pay, PhonePe, Paytm, BHIM, or your bank app).
                  </p>
                </div>

                {/* Demo Mode / Unconfigured Warning Notice */}
                {(!isProduction || orderData?.isDemo || !orderData?.isConfigured) && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <span className="font-bold uppercase tracking-wider block font-mono text-[10px]">
                        DEMO MODE — DEMO UPI QR (NON-PAYABLE)
                      </span>
                      <span className="text-[11px] text-white/80 block leading-tight">
                        No real money will be charged. This is a simulated checkout prototype. Submitting verification records a review request for testing.
                      </span>
                    </div>
                  </div>
                )}

                {/* QR Code and Payment Details Container */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center gap-3">
                  {qrCodeDataUrl ? (
                    <div className="relative p-2.5 rounded-2xl bg-white shadow-2xl border-2 border-[#FFC857]/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrCodeDataUrl}
                        alt="UPI Payment QR Code"
                        className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 rounded-2xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-xs text-[#8993A7]">
                      Loading QR...
                    </div>
                  )}

                  {/* Payment Metadata Grid */}
                  <div className="w-full space-y-2 text-xs font-mono pt-1">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-[#8993A7]">Payee:</span>
                      <div className="flex items-center gap-1.5 font-medium text-[#F5F7FA]">
                        <span>{orderData?.payeeName} ({orderData?.payeeVpa})</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(orderData?.payeeVpa || '', 'vpa')}
                          className="text-[#8993A7] hover:text-[#FFC857] cursor-pointer"
                          title="Copy UPI ID"
                        >
                          {copiedField === 'vpa' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-[#8993A7]">Exact Amount:</span>
                      <span className="text-sm font-bold text-[#FFC857]">
                        ₹{orderData?.amount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-[#8993A7]">Order Reference:</span>
                      <div className="flex items-center gap-1.5 font-medium text-[#7DD3FC]">
                        <span className="truncate max-w-[160px]">{orderData?.orderId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(orderData?.orderId || '', 'orderId')}
                          className="text-[#8993A7] hover:text-[#FFC857] cursor-pointer"
                          title="Copy Order ID"
                        >
                          {copiedField === 'orderId' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Direct UPI Intent Link for Mobile Visitors */}
                    {orderData?.upiUri && (
                      <a
                        href={orderData.upiUri}
                        className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-center text-[#7DD3FC] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Tap to open in UPI App</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Manual Verification Disclosure Alert */}
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-[#8993A7] leading-relaxed">
                  <span className="font-semibold text-white/90 block mb-0.5 font-mono uppercase text-[10px]">
                    Manual Verification Notice
                  </span>
                  WorldBeacon uses manual verification. Paying via QR submits your order for review. An administrator verifies the transaction against bank statement records before activating the light.
                </div>

                {/* Untrusted Transaction ID / UTR input */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8993A7] font-mono mb-1">
                    UPI Transaction ID / UTR (Optional)
                  </label>
                  <input
                    type="text"
                    id="input-claimed-utr"
                    placeholder="e.g. 12-digit UTR from your payment receipt"
                    value={claimedUtr}
                    onChange={(e) => setClaimedUtr(e.target.value)}
                    maxLength={40}
                    className="w-full py-2 px-3 rounded-xl bg-white/[0.04] text-[#F5F7FA] border border-white/10 text-xs font-mono focus:outline-none focus:border-[#FFC857]"
                  />
                  <span className="text-[10px] text-[#8993A7] font-mono mt-0.5 block">
                    Providing your UTR speeds up reconciliation against bank statements.
                  </span>
                </div>

                {submissionError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2 font-mono">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submissionError}</span>
                  </div>
                )}

                {/* Accessible Trust & Payment Support Links */}
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8993A7] px-1">
                  <span>Need payment assistance?</span>
                  <div className="flex items-center gap-2">
                    <a
                      href="/contribution-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#FFC857] underline transition-colors"
                    >
                      Contribution Policy
                    </a>
                    <span>•</span>
                    <a
                      href="/payment-support"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#FFC857] underline transition-colors"
                    >
                      Payment Support
                    </a>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 flex justify-between items-center shrink-0">
                  <button
                    type="button"
                    id="btn-back-step-4"
                    onClick={() => setStep(3)}
                    className="px-4 py-2 text-xs text-[#8993A7] hover:text-[#F5F7FA] flex items-center gap-1.5 cursor-pointer font-mono"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>BACK</span>
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-ignition"
                    disabled={isSubmittingVerification}
                    onClick={handleSubmitVerification}
                    className="btn-gold px-7 py-3 rounded-full text-xs font-semibold uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-2xl disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-[#030407]" />
                    <span>{isSubmittingVerification ? 'SUBMITTING...' : "I'VE PAID — SUBMIT"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
