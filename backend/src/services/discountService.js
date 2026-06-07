export function calculateEarlyPaymentDiscount({ invoiceAmount, paymentTerms, paymentDiscountDate, actualPaymentDate }) {
  const percentage = extractDiscountPercentage(paymentTerms);
  if (!percentage || !invoiceAmount || !paymentDiscountDate || !actualPaymentDate) {
    return { eligible: false, discountPercentage: percentage || 0, discountAmount: 0, reason: 'Missing discount terms, amount, or dates.' };
  }

  const discountDate = new Date(paymentDiscountDate);
  const paidDate = new Date(actualPaymentDate);
  const eligible = paidDate <= discountDate;
  const discountAmount = eligible ? Number(invoiceAmount) * (percentage / 100) : 0;

  return {
    eligible,
    discountPercentage: percentage,
    discountAmount: Number(discountAmount.toFixed(2)),
    reason: eligible ? 'Payment date qualifies for early payment discount.' : 'Payment date is after the discount date.'
  };
}

function extractDiscountPercentage(paymentTerms = '') {
  const text = String(paymentTerms).toUpperCase();
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (match) return Number(match[1]);
  const shorthand = text.match(/(\d+(?:\.\d+)?)\s*\/\s*\d+/);
  if (shorthand) return Number(shorthand[1]);
  return 0;
}
