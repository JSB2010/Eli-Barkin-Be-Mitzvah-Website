#!/usr/bin/env node

/**
 * Email Deliverability Test Script
 * 
 * This script tests the deliverability of emails from your domain by:
 * 1. Checking your DNS settings for proper SPF, DKIM, and DMARC records
 * 2. Testing the validity of your email configuration
 * 3. Providing recommendations for improving deliverability
 * 
 * Requirements:
 * - Node.js 14+
 * - npm packages: dns, axios, chalk (install with: npm install axios chalk)
 */

const dns = require('dns');
const { promisify } = require('util');
const axios = require('axios');
const chalk = require('chalk');
const { URL } = require('url');
// Helper to check allowed DNS CNAME host
// Accepts direct domain, or subdomain of allowed domain
function isAllowedHost(cname, allowedDomains) {
  if (!cname) return false;
  // Normalize: remove trailing dot if present
  let host = cname.endsWith('.') ? cname.slice(0, -1) : cname;
  // Lowercase
  host = host.toLowerCase();
  // Direct match
  if (allowedDomains.includes(host)) return true;
  // Subdomain match
  return allowedDomains.some(d =>
    host === d || host.endsWith('.' + d)
  );
}
const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

// Configuration
const DOMAIN = 'elibarkin.com';
const EMAIL = 'rsvps@elibarkin.com';

// ASCII Art header
console.log(chalk.blue(`
  ┌─────────────────────────────────────────────┐
  │                                             │
  │  Email Deliverability Test for ${DOMAIN}  │
  │                                             │
  └─────────────────────────────────────────────┘
`));

async function checkSpfRecord() {
  console.log(chalk.yellow('\n📋 Checking SPF Record...'));
  try {
    const records = await resolveTxt(DOMAIN);
    const spfRecords = records.filter(record => record[0].startsWith('v=spf1'));
    
    if (spfRecords.length === 0) {
      console.log(chalk.red('❌ No SPF record found!'));
      console.log(chalk.white('  Recommendation: Add an SPF record to authorize email senders:'));
      console.log(chalk.gray('  v=spf1 include:spf.sendinblue.com include:_spf.google.com ~all'));
      return { pass: false, record: null };
    } else if (spfRecords.length > 1) {
      console.log(chalk.red('❌ Multiple SPF records found! This can cause issues.'));
      console.log(chalk.white('  Recommendation: Combine into a single SPF record.'));
      return { pass: false, record: spfRecords.map(r => r[0]) };
    } else {
      const spfRecord = spfRecords[0][0];
      
      // Check if Brevo's SPF is included
      if (!spfRecord.includes('include:spf.sendinblue.com')) {
        console.log(chalk.red('❌ SPF record doesn\'t include Brevo (Sendinblue)!'));
        console.log(chalk.white('  Recommendation: Update your SPF record to include:'));
        console.log(chalk.gray('  include:spf.sendinblue.com'));
        return { pass: false, record: spfRecord };
      }
      
      console.log(chalk.green('✅ Valid SPF record found:'));
      console.log(chalk.gray(`  ${spfRecord}`));
      return { pass: true, record: spfRecord };
    }
  } catch (error) {
    console.log(chalk.red(`❌ Error checking SPF record: ${error.message}`));
    return { pass: false, record: null };
  }
}

async function checkDkimRecord() {
  console.log(chalk.yellow('\n📋 Checking DKIM Configuration...'));
  
  const selectors = ['mail', 'brevo', 'dkim'];
  let foundDkim = false;
  let dkimDetails = null;
  
  for (const selector of selectors) {
    try {
      const dkimDomain = `${selector}._domainkey.${DOMAIN}`;
      const records = await resolveTxt(dkimDomain);
      
      if (records.length > 0) {
        console.log(chalk.green(`✅ DKIM record found for selector '${selector}':`));
        console.log(chalk.gray(`  ${records[0][0]}`));
        foundDkim = true;
        dkimDetails = { selector, record: records[0][0] };
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!foundDkim) {
    console.log(chalk.red('❌ No DKIM records found for common selectors!'));
    console.log(chalk.white('  Recommendation: Setup DKIM in your Brevo account and add the provided records.'));
    return { pass: false, record: null };
  }
  
  return { pass: true, record: dkimDetails };
}

async function checkDmarcRecord() {
  console.log(chalk.yellow('\n📋 Checking DMARC Record...'));
  
  try {
    const dmarcDomain = `_dmarc.${DOMAIN}`;
    const records = await resolveTxt(dmarcDomain);
    
    if (records.length === 0) {
      console.log(chalk.red('❌ No DMARC record found!'));
      console.log(chalk.white('  Recommendation: Add a DMARC record to specify handling of failed emails:'));
      console.log(chalk.gray('  v=DMARC1; p=none; sp=none; rua=mailto:your@email.com; adkim=r; aspf=r; pct=100;'));
      return { pass: false, record: null };
    }
    
    const dmarcRecord = records[0][0];
    
    if (!dmarcRecord.startsWith('v=DMARC1')) {
      console.log(chalk.red('❌ Invalid DMARC record format!'));
      return { pass: false, record: dmarcRecord };
    }
    
    console.log(chalk.green('✅ Valid DMARC record found:'));
    console.log(chalk.gray(`  ${dmarcRecord}`));
    
    // Extract policy
    const policyMatch = dmarcRecord.match(/p=([^;]+)/);
    const policy = policyMatch ? policyMatch[1] : 'unknown';
    
    if (policy === 'none') {
      console.log(chalk.yellow('⚠️ DMARC policy is set to "none" (monitoring only)'));
      console.log(chalk.white('  Recommendation: Once confident in your setup, consider "p=quarantine" or "p=reject"'));
    } else if (policy === 'quarantine') {
      console.log(chalk.blue('ℹ️ DMARC policy is set to "quarantine" (mark as spam)'));
    } else if (policy === 'reject') {
      console.log(chalk.green('✅ DMARC policy is set to "reject" (strongest protection)'));
    }
    
    return { pass: true, record: dmarcRecord, policy };
  } catch (error) {
    console.log(chalk.red(`❌ Error checking DMARC record: ${error.message}`));
    return { pass: false, record: null };
  }
}

async function checkMxRecords() {
  console.log(chalk.yellow('\n📋 Checking MX Records...'));
  
  try {
    const records = await resolveMx(DOMAIN);
    
    if (records.length === 0) {
      console.log(chalk.red('❌ No MX records found!'));
      console.log(chalk.white('  Recommendation: Add MX records for your email provider.'));
      return { pass: false, records: [] };
    }
    
    console.log(chalk.green(`✅ Found ${records.length} MX record(s):`));
    records.forEach(record => {
      console.log(chalk.gray(`  Priority: ${record.priority}, Exchange: ${record.exchange}`));
    });
    
    return { pass: true, records };
  } catch (error) {
    console.log(chalk.red(`❌ Error checking MX records: ${error.message}`));
    return { pass: false, records: [] };
  }
}

async function checkReturnPath() {
  console.log(chalk.yellow('\n📋 Checking Return-Path Configuration...'));
  
  try {
    const bounceDomain = `bounce.${DOMAIN}`;
    
    try {
      // Try to resolve as CNAME first
      const records = await promisify(dns.resolveCname)(bounceDomain);
      
      if (records.length > 0) {
        console.log(chalk.green('✅ Return-Path configuration found (CNAME):'));
        console.log(chalk.gray(`  ${records[0]}`));
        
        const allowedBounceDomains = ['sendinblue.com', 'brevo.com'];
        if (isAllowedHost(records[0], allowedBounceDomains)) {
          console.log(chalk.green('✅ Properly configured with Brevo/Sendinblue'));
        }
        
        return { pass: true, record: records[0], type: 'CNAME' };
      }
    } catch (error) {
      // Fall back to checking for A record
      try {
        const aRecords = await promisify(dns.resolve4)(bounceDomain);
        
        if (aRecords.length > 0) {
          console.log(chalk.green('✅ Return-Path configuration found (A record):'));
          console.log(chalk.gray(`  ${aRecords[0]}`));
          return { pass: true, record: aRecords[0], type: 'A' };
        }
      } catch (error) {
        // Not found
      }
    }
    
    console.log(chalk.red('❌ No Return-Path configuration found!'));
    console.log(chalk.white('  Recommendation: Add a "bounce" subdomain CNAME record pointing to Brevo\'s bounce domain.'));
    return { pass: false, record: null };
  } catch (error) {
    console.log(chalk.red(`❌ Error checking Return-Path: ${error.message}`));
    return { pass: false, record: null };
  }
}

async function runEmailTest() {
  console.log(chalk.yellow('\n📧 Running Email Configuration Tests...'));
  
  const spfResult = await checkSpfRecord();
  const dkimResult = await checkDkimRecord();
  const dmarcResult = await checkDmarcRecord();
  const mxResult = await checkMxRecords();
  const returnPathResult = await checkReturnPath();
  
  // Calculate overall score
  let score = 0;
  let maxScore = 0;
  
  if (spfResult.pass) score += 20;
  maxScore += 20;
  
  if (dkimResult.pass) score += 25;
  maxScore += 25;
  
  if (dmarcResult.pass) {
    score += 15;
    if (dmarcResult.policy === 'quarantine') score += 5;
    if (dmarcResult.policy === 'reject') score += 10;
  }
  maxScore += 25;
  
  if (mxResult.pass) score += 15;
  maxScore += 15;
  
  if (returnPathResult.pass) score += 15;
  maxScore += 15;
  
  const percentage = Math.round((score / maxScore) * 100);
  let rating = '';
  let color = null;
  
  if (percentage >= 90) {
    rating = 'EXCELLENT';
    color = chalk.green;
  } else if (percentage >= 75) {
    rating = 'GOOD';
    color = chalk.blue;
  } else if (percentage >= 50) {
    rating = 'FAIR';
    color = chalk.yellow;
  } else {
    rating = 'POOR';
    color = chalk.red;
  }
  
  // Summary
  console.log(chalk.yellow('\n📊 Email Deliverability Summary:'));
  console.log(chalk.white(`  Domain: ${DOMAIN}`));
  console.log(chalk.white(`  Email: ${EMAIL}`));
  console.log(color(`  
  Score: ${percentage}% - ${rating}
  
  ╔═══════════════════════════════════╗
  ║ SPF:        ${spfResult.pass ? '✅ Configured' : '❌ Missing'} ${' '.repeat(14)}║
  ║ DKIM:       ${dkimResult.pass ? '✅ Configured' : '❌ Missing'} ${' '.repeat(14)}║
  ║ DMARC:      ${dmarcResult.pass ? '✅ Configured' : '❌ Missing'} ${' '.repeat(14)}║
  ║ MX Records: ${mxResult.pass ? '✅ Configured' : '❌ Missing'} ${' '.repeat(14)}║
  ║ Return-Path: ${returnPathResult.pass ? '✅ Configured' : '❌ Missing'} ${' '.repeat(13)}║
  ╚═══════════════════════════════════╝
  `));
  
  // Recommendations
  if (percentage < 100) {
    console.log(chalk.yellow('\n📝 Recommendations to Improve Deliverability:'));
    
    if (!spfResult.pass) {
      console.log(chalk.white('  1. Configure SPF record as described above'));
    }
    
    if (!dkimResult.pass) {
      console.log(chalk.white('  2. Set up DKIM in your Brevo dashboard and add the DNS records'));
    }
    
    if (!dmarcResult.pass) {
      console.log(chalk.white('  3. Add a DMARC record as described above'));
    } else if (dmarcResult.policy === 'none') {
      console.log(chalk.white('  4. Consider upgrading your DMARC policy from "none" to "quarantine" or "reject"'));
    }
    
    if (!returnPathResult.pass) {
      console.log(chalk.white('  5. Configure a Return-Path (bounce subdomain) for better bounce handling'));
    }
    
    console.log(chalk.blue('\n💡 Additional Tips:'));
    console.log(chalk.white('  • Use consistent "From" addresses'));
    console.log(chalk.white('  • Include proper unsubscribe links in all emails'));
    console.log(chalk.white('  • Monitor your reputation using tools like MX Toolbox and Google Postmaster Tools'));
    console.log(chalk.white('  • See the email-deliverability-best-practices.md file for more details'));
  } else {
    console.log(chalk.green('\n🎉 Congratulations! Your email configuration is optimized for deliverability.'));
  }
}

// Run the tests
runEmailTest().catch(error => {
  console.error(chalk.red(`\n❌ An error occurred: ${error.message}`));
});
