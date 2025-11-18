
import { useState, useCallback } from 'react';
import DOMPurify from 'dompurify';

/**
 * A hook to manage input state with automatic sanitization to prevent XSS.
 * @param initialValue The initial string value.
 * @returns [value, setValue, sanitizedValue]
 */
export const useSanitizedInput = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  const sanitizedValue = DOMPurify.sanitize(value);

  return {
    value,
    setValue: handleChange,
    sanitizedValue,
    isValid: value.trim().length > 0 // Basic validation example
  };
};

/**
 * Utility function to sanitize a string directly.
 * Useful for data processing before saving to state/DB.
 */
export const sanitizeString = (str: string): string => {
    return DOMPurify.sanitize(str);
};
