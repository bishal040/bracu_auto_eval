#!/usr/bin/env node
// =============================================
// BRACU Auto Eval — KEY GENERATOR (ONLY FOR YOU)
// Keep this file SECRET. Never share it.
// =============================================
// Usage: node generate_key.js <student_id>
// Example: node generate_key.js 21301000

const SECRET = 'BRACU-BISHAL-X9K2M-2026'; // Your secret salt — NEVER share this

function generateKey(studentId) {
  const input = `${SECRET}-${studentId}-AUTOEVAL`;
  
  // Simple hash-based key generation
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  
  // Convert to positive number and create key segments
  const n = Math.abs(hash);
  const seg1 = (n % 9000 + 1000).toString();
  const seg2 = ((n >> 8) % 9000 + 1000).toString();
  const seg3 = ((n >> 16) % 9000 + 1000).toString();
  
  // Create a checksum
  const checksum = ((parseInt(seg1) + parseInt(seg2) + parseInt(seg3)) % 9000 + 1000).toString();
  
  return `AE-${seg1}-${seg2}-${seg3}-${checksum}`;
}

// Validate a key (same logic used in extension)
function validateKey(key, studentId) {
  const expected = generateKey(studentId);
  return key === expected;
}

// --- CLI ---
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('========================================');
  console.log('  BRACU Auto Eval — Key Generator');
  console.log('========================================');
  console.log('');
  console.log('Usage:   node generate_key.js <student_id>');
  console.log('Example: node generate_key.js 21301000');
  console.log('');
  process.exit(0);
}

const studentId = args[0];
const key = generateKey(studentId);

console.log('');
console.log('========================================');
console.log('  Key Generated Successfully!');
console.log('========================================');
console.log(`  Student ID: ${studentId}`);
console.log(`  Key:        ${key}`);
console.log('========================================');
console.log('');
console.log('Share this key with the student.');
console.log('They enter their Student ID + this key in the extension.');
