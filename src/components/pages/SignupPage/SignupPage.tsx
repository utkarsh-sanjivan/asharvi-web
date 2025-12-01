'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import Checkbox from '@/components/atoms/Checkbox';
import SocialLoginButton from '@/components/molecules/SocialLoginButton';
import PasswordValidation from '@/components/molecules/PasswordValidation';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useRegisterMutation } from '@/store/api/auth.api';
import { 
  MailIcon, 
  PhoneIcon, 
  LockIcon, 
  EyeIcon, 
  EyeOffIcon 
} from '@/components/icons';
import './index.css';

export default function SignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [registerUser] = useRegisterMutation();
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);

  // Step 1 - Basic Information
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  // Step 1 Errors
  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneNumberError, setPhoneNumberError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');

  // Step 2 - Parent Profile Data
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');

  // Step 2 Errors
  const [occupationError, setOccupationError] = useState('');
  const [cityError, setCityError] = useState('');

  // Password validation states
  const hasMinLength = password.length >= 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const isPasswordValid = hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSpecialChar;

  // Util function
  const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
      router.refresh();
    }
  }, [isAuthenticated, router]);

  // Step 1 submit handler
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFullNameError('');
    setEmailError('');
    setPhoneNumberError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setTermsError('');

    let hasError = false;

    if (!fullName.trim()) {
      setFullNameError('Full Name is required');
      hasError = true;
    }

    if (!email || !validateEmail(email)) {
      setEmailError('Valid Email is required');
      hasError = true;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      setPhoneNumberError('Valid Phone number is required');
      hasError = true;
    }

    if (!isPasswordValid) {
      setPasswordError('Password must meet all requirements');
      hasError = true;
    }

    if (!passwordsMatch) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }

    if (!agreeTerms || !agreePrivacy) {
      setTermsError('You must agree to Terms and Privacy Policy');
      hasError = true;
    }

    if (!hasError) {
      setCurrentStep(2);
    }
  };

  // Step 2 submit handler with API call
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOccupationError('');
    setCityError('');

    let hasError = false;

    if (!occupation.trim()) {
      setOccupationError('Occupation is required');
      hasError = true;
    }

    if (!city.trim()) {
      setCityError('City is required');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    // Call API to register user with all details
    setIsLoading(true);

    try {
      console.log('📤 Sending registration data:', {
        name: fullName,
        email: email,
        phoneNumber: `${countryCode}${phoneNumber}`,
        occupation: occupation,
        city: city
      });

      await registerUser({
        name: fullName,
        email: email,
        phoneNumber: `${countryCode}${phoneNumber}`,
        password: password,
        occupation: occupation,
        city: city
      }).unwrap();

      if (env.APP_ENV === 'production') {
        router.push('/');
      } else {
        router.push('/auth/login?registered=true');
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);

      // Handle specific error messages
      const errorMessage =
        error?.data?.message || error?.data?.error || error?.message || 'Registration failed. Please try again.';
      
      // Show error based on field
      if (errorMessage.toLowerCase().includes('email')) {
        setEmailError(errorMessage);
        setCurrentStep(1); // Go back to step 1
      } else if (errorMessage.toLowerCase().includes('phone')) {
        setPhoneNumberError(errorMessage);
        setCurrentStep(1); // Go back to step 1
      } else {
        setOccupationError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignup = async (provider: 'google' | 'facebook' | 'apple') => {
    setIsLoading(true);
    try {
      // TODO: Implement OAuth flow when server supports it
      console.log(`Signup with ${provider}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Social signup failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-card">

          {/* Ashravi Header and Description */}
          <section className="signup-header">
            <Link href="/" className="logo-link">
              <h1 className="signup-title">Ashravi</h1>
            </Link>
            <p className="signup-subtitle">
              Transform Your Parenting Journey with Evidence-Based Strategies
            </p>
            <p className="signup-description">
              Join thousands of parents to access courses, tracking, and expert guidance.
            </p>
          </section>

          {/* Stepper with step names */}
          <div className="signup-steps">
            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
              <div className="step-badge">1</div>
              <div className="step-label">Basic Info</div>
            </div>
            <div className="step-line" />
            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
              <div className="step-badge">2</div>
              <div className="step-label">Profile</div>
            </div>
          </div>

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="signup-form">
              <Input
                id="fullName"
                label="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                error={fullNameError}
                placeholder="Enter your full name"
                required
                fullWidth
              />
              
              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                error={emailError}
                placeholder="Enter your email"
                leftIcon={<MailIcon style={{ width: 20, height: 20 }} />}
                required
                fullWidth
              />
              
              {/* Phone Input Group */}
              <div className="phone-field-group">
                <label className="phone-group-label">Phone Number *</label>
                <div className="phone-inputs">
                  <select
                    id="countryCode"
                    aria-label="Country code"
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    className="country-code-select"
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+61">🇦🇺 +61</option>
                  </select>
                  
                  <div className="phone-number-input">
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      error={phoneNumberError}
                      placeholder="Enter phone number"
                      leftIcon={<PhoneIcon style={{ width: 20, height: 20 }} />}
                      required
                      fullWidth
                    />
                  </div>
                </div>
              </div>
              
              <Input
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                error={passwordError}
                placeholder="Create a password"
                leftIcon={<LockIcon style={{ width: 20, height: 20 }} />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="password-toggle">
                    {showPassword ? <EyeOffIcon style={{ width: 20, height: 20 }} /> : <EyeIcon style={{ width: 20, height: 20 }} />}
                  </button>
                }
                required
                fullWidth
              />
              
              {/* Password Validation - Show all requirements */}
              {password.length > 0 && (
                <PasswordValidation password={password} />
              )}

              <Input
                id="confirmPassword"
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                error={confirmPasswordError}
                placeholder="Re-enter your password"
                leftIcon={<LockIcon style={{ width: 20, height: 20 }} />}
                rightIcon={
                  <button type="button" onClick={() => setShowConfirmPassword(s => !s)} className="password-toggle">
                    {showConfirmPassword ? <EyeOffIcon style={{ width: 20, height: 20 }} /> : <EyeIcon style={{ width: 20, height: 20 }} />}
                  </button>
                }
                required
                fullWidth
              />

              {/* Password Match Validation - Only show match status */}
              {confirmPassword.length > 0 && (
                <PasswordValidation 
                  password={password} 
                  confirmPassword={confirmPassword}
                  showConfirmMatchOnly={true}
                />
              )}

              <div className="terms-group">
                <Checkbox
                  id="terms"
                  label={<span>I agree to the <Link href="/terms" target="_blank" className="terms-link">Terms of Service</Link></span>}
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  required
                />
                <Checkbox
                  id="privacy"
                  label={<span>I agree to the <Link href="/privacy" target="_blank" className="terms-link">Privacy Policy</Link></span>}
                  checked={agreePrivacy}
                  onChange={e => setAgreePrivacy(e.target.checked)}
                  required
                />
                {termsError && <div className="input-error">{termsError}</div>}
              </div>
              
              <Button type="submit" variant="primary" size="lg" className="w-full" loading={isLoading}>
                Continue
              </Button>

              {/* Divider */}
              <div className="divider">
                <span className="divider-line" />
                <span className="divider-text">OR SIGN UP WITH</span>
                <span className="divider-line" />
              </div>

              {/* Social Signup */}
              <div className="social-signup">
                <SocialLoginButton provider="google" onClick={() => handleSocialSignup('google')} disabled={isLoading} />
                <SocialLoginButton provider="facebook" onClick={() => handleSocialSignup('facebook')} disabled={isLoading} />
                <SocialLoginButton provider="apple" onClick={() => handleSocialSignup('apple')} disabled={isLoading} />
              </div>

              <div className="signup-footer">
                <p className="footer-text">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="footer-link">Login</Link>
                </p>
              </div>
            </form>
          )}

          {/* Step 2: Profile Setup */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="signup-form">
              <Input
                id="occupation"
                label="Occupation"
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                error={occupationError}
                placeholder="Enter your occupation"
                required
                fullWidth
              />
              
              <Input
                id="city"
                label="City"
                value={city}
                onChange={e => setCity(e.target.value)}
                error={cityError}
                placeholder="Enter your city"
                required
                fullWidth
              />

              <div className="form-actions">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="lg" 
                  className="w-full" 
                  onClick={() => setCurrentStep(1)}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  className="w-full" 
                  loading={isLoading}
                >
                  Continue
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
