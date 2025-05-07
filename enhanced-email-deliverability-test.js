#!/usr/bin/env node

/**
 * Enhanced Email Deliverability Test Script
 * 
 * This script tests the deliverability of emails from your domain by:
 * 1. Checking your DNS settings for proper SPF, DKIM, and DMARC records
 * 2. Testing the validity of your email configuration
 * 3. Providing specific recommendations for improving deliverability
 * 4. Linking to implementation guides for step-by-step instructions
 * 
 * Requirements:
 * - Node.js 14+
 * - npm packages: dns, axios, chalk (install with: npm install axios chalk)
 */

const dns = require('dns');
const { promisify } = require('util');
const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Promisify DNS methods
const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

// Configuration
const DOMAIN = 'elibarkin.com';
const EMAIL = 'rsvps@elibarkin.com';

// ASCII Art header
console.log(chalk.blue(`
  ┌───────────────────────────────────────────────┐
  │                                               │
  │  Enhanced Email Deliverability Test v2.0      │
  │  Domain: ${DOMAIN}                           │
  │                                               │
  └───────────────────────────────────────────────┘
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
      console.log(chalk.gray('  v=DMARC1; p=none; sp=none; rua=mailto:jacobsamuelbarkin@gmail.com; adkim=r; aspf=r; pct=100;'));
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
        
        if (records[0].includes('sendinblue.com') || records[0].includes('brevo.com')) {
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
  
  // Enhanced Recommendations
  if (percentage < 100) {
    console.log(chalk.yellow('\n📝 Recommendations to Improve Deliverability:'));
    
    if (!spfResult.pass) {
      console.log(chalk.white('  1. Configure SPF record as described above'));
      console.log(chalk.gray('     → See "Step 3: Set Up DNS Records" in email-implementation-guide.md'));
    }
    
    if (!dkimResult.pass) {
      console.log(chalk.white('  2. Set up DKIM in your Brevo dashboard and add the DNS records'));
      console.log(chalk.gray('     → Log in to Brevo → Settings → Senders & IPs → Manage Domains'));
    }
    
    if (!dmarcResult.pass) {
      console.log(chalk.white('  3. Add a DMARC record as described above'));
      console.log(chalk.gray('     → Start with "p=none" for monitoring mode'));
    } else if (dmarcResult.policy === 'none') {
      console.log(chalk.white('  4. Consider upgrading your DMARC policy from "none" to "quarantine" or "reject"'));
      console.log(chalk.gray('     → Only after 2-4 weeks of successful monitoring'));
    }
    
    if (!returnPathResult.pass) {
      console.log(chalk.white('  5. Configure a Return-Path (bounce subdomain) for better bounce handling'));
      console.log(chalk.gray('     → Add CNAME record for "bounce.elibarkin.com" pointing to Brevo'));
    }
    
    console.log(chalk.blue('\n💡 Next Steps:'));
    console.log(chalk.white('  1. Follow the step-by-step instructions in email-implementation-guide.md'));
    console.log(chalk.white('  2. After implementing DNS changes, run this test again (allow 24-48h for DNS propagation)'));
    console.log(chalk.white('  3. When DNS setup is complete, run test-email-delivery.js to test actual delivery'));
    console.log(chalk.white('  4. Review the Email Deliverability FAQ for common issues'));
    
    console.log(chalk.blue('\n📚 Available Resources:'));
    console.log(chalk.white('  • email-authentication-guide.md - Technical details on authentication'));
    console.log(chalk.white('  • email-implementation-guide.md - Step-by-step implementation instructions'));
    console.log(chalk.white('  • email-deliverability-best-practices.md - Ongoing maintenance tips'));
    console.log(chalk.white('  • email-deliverability-faq.md - Common questions and troubleshooting'));
  } else {
    console.log(chalk.green('\n🎉 Congratulations! Your email configuration is optimized for deliverability.'));
    console.log(chalk.white('\nNext recommended steps:'));
    console.log(chalk.white('  1. Run test-email-delivery.js to verify actual delivery to major email providers'));
    console.log(chalk.white('  2. Set up Google Postmaster Tools to monitor your domain reputation'));
    console.log(chalk.white('  3. Schedule regular deliverability checks using this script'));
  }
  
  // Create a JSON report
  const reportData = {
    domain: DOMAIN,
    email: EMAIL,
    timestamp: new Date().toISOString(),
    score: percentage,
    rating: rating,
    tests: {
      spf: spfResult,
      dkim: dkimResult,
      dmarc: dmarcResult,
      mx: mxResult,
      returnPath: returnPathResult
    }
  };
  
  // Save the report to a file
  try {
    const reportPath = path.join(process.cwd(), 'email-deliverability-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(chalk.blue(`\n📋 Detailed report saved to: email-deliverability-report.json`));
  } catch (error) {
    console.error(chalk.red(`\n❌ Failed to save report: ${error.message}`));
  }
}

// Run the tests
runEmailTest().catch(error => {
  console.error(chalk.red(`\n❌ An error occurred: ${error.message}`));
});
