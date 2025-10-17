// Number formatting utilities for consistent display across the platform

/**
 * Format a number with commas and specified decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param showSign - Whether to show + sign for positive numbers (default: false)
 * @returns Formatted number string (e.g., "80,000.00")
 */
export function formatNumber(value: number | string | null | undefined, decimals: number = 2, showSign: boolean = false): string {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0.00';
  }
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
  
  if (showSign && numValue > 0) {
    return `+${formatted}`;
  }
  
  return formatted;
}

/**
 * Format currency values with $ symbol
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string (e.g., "$80,000.00")
 */
export function formatCurrency(value: number | string | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || value === '') {
    return '$0.00';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
}

/**
 * Format crypto amounts with appropriate decimal places
 * @param value - The number to format
 * @param currency - The crypto currency (BTC, ETH, USDT, etc.)
 * @returns Formatted crypto string (e.g., "0.001234 BTC")
 */
export function formatCrypto(value: number | string | null | undefined, currency: string = ''): string {
  if (value === null || value === undefined || value === '') {
    return `0.000000 ${currency}`;
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return `0.000000 ${currency}`;
  }
  
  // Different decimal places for different cryptocurrencies
  let decimals = 6;
  if (currency === 'BTC') {
    decimals = 8;
  } else if (currency === 'ETH') {
    decimals = 6;
  } else if (currency === 'USDT') {
    decimals = 2;
  }
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
  
  return `${formatted} ${currency}`;
}

/**
 * Format large numbers with abbreviations (K, M, B, T)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "80.5K", "1.2M")
 */
export function formatCompact(value: number | string | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }
  
  const absValue = Math.abs(numValue);
  
  if (absValue >= 1e12) {
    return `${(numValue / 1e12).toFixed(decimals)}T`;
  } else if (absValue >= 1e9) {
    return `${(numValue / 1e9).toFixed(decimals)}B`;
  } else if (absValue >= 1e6) {
    return `${(numValue / 1e6).toFixed(decimals)}M`;
  } else if (absValue >= 1e3) {
    return `${(numValue / 1e3).toFixed(decimals)}K`;
  }
  
  return numValue.toFixed(decimals);
}

/**
 * Format percentage values
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param showSign - Whether to show + sign for positive numbers (default: false)
 * @returns Formatted percentage string (e.g., "15.50%")
 */
export function formatPercentage(value: number | string | null | undefined, decimals: number = 2, showSign: boolean = false): string {
  if (value === null || value === undefined || value === '') {
    return '0.00%';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0.00%';
  }
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
  
  if (showSign && numValue > 0) {
    return `+${formatted}%`;
  }
  
  return `${formatted}%`;
}

/**
 * Format weight values (for gold)
 * @param value - The weight value to format
 * @param unit - The unit (g, oz, kg, etc.)
 * @param decimals - Number of decimal places (default: 4)
 * @returns Formatted weight string (e.g., "1,250.5000 g")
 */
export function formatWeight(value: number | string | null | undefined, unit: string = 'g', decimals: number = 4): string {
  if (value === null || value === undefined || value === '') {
    return `0.0000 ${unit}`;
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return `0.0000 ${unit}`;
  }
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
  
  return `${formatted} ${unit}`;
}
