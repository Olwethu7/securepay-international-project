/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SECURITY_PATTERNS = {
  // Letters, spaces, hyphens only
  RECIPIENT_NAME: /^[a-zA-Z\s\-]{2,100}$/,
  
  // Alphanumeric, 15-34 chars (general IBAN length)
  IBAN: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/,
  
  // Standard SWIFT/BIC RegEx (8 or 11 characters)
  SWIFT_BIC: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  
  // Positive decimal, max 2 places
  AMOUNT: /^\d+(\.\d{1,2})?$/,
  
  // Text whitelisted (alphanumeric, spaces, basic punctuation)
  REASON: /^[a-zA-Z0-9\s\.,!\?\-]{2,200}$/,
  
  // Email validation
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/
};

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'ZAR'];
