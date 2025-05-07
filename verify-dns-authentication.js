#!/usr/bin/env node

/**
 * DNS Authentication Verification Script
 * 
 * This script specifically tests if the required DNS records for email 
 * authentication have been properly implemented and propagated.
 * 
 * Run this after adding your SPF, DKIM, and DMARC records to verify
 * they are correctly configured.
 */

const dns = require('dns');
const { promisify } = require('util');
const chalk = require('chalk');

// Promisify DNS methods
const resolveTxt = promisify(dns.resolveTxt);

// Configuration
const DOMAIN = 'elibarkin.com';
const DKIM_SELECTORS = ['brevo', 'mail', 'dkim']; // Potential DKIM selectors

console.log(chalk.blue(`
  ┌───────────────────────────────────────────────┐
  │                                               │
  │  DNS Authentication Verification              │
  │  Domain: ${DOMAIN}                           │
  │  Date: ${new Date().toLocaleString()}        │
  │                                               │
  └───────────────────────────────────────────────┘
`));

async function runAllChecks() {
  // Track overall status
  let allPassed = true;
  
  // Check SPF
  console.log(chalk.yellow('\n🔍 Checking SPF Record...'));
  try {
    const records = await resolveTxt(DOMAIN);
    const spfRecords = records.filter(record => record[0].startsWith('v=spf1'));
    
    if (spfRecords.length === 0) {
      console.log(chalk.red('❌ SPF: NOT FOUND'));
      console.log(chalk.white('  Your SPF record has not been implemented or has not propagated yet.'));
      allPassed = false;
    } else if (spfRecords.length > 1) {
      console.log(chalk.red('❌ SPF: MULTIPLE RECORDS FOUND'));
      console.log(chalk.white('  You have multiple SPF records, which can cause issues.'));
      allPassed = false;
    } else {
      const spfRecord = spfRecords[0][0];
      
      if (!spfRecord.includes('include:spf.sendinblue.com')) {
        console.log(chalk.red('❌ SPF: INCORRECT CONFIGURATION'));
        console.log(chalk.white('  Your SPF record doesn\'t include Brevo (Sendinblue).'));
        allPassed = false;
      } else {
        console.log(chalk.green('✅ SPF: CORRECTLY IMPLEMENTED'));
        console.log(chalk.gray(`  Record: ${spfRecord}`));
      }
    }
  } catch (error) {
    console.log(chalk.red(`❌ SPF: ERROR - ${error.message}`));
    allPassed = false;
  }
  
  // Check DKIM
  console.log(chalk.yellow('\n🔍 Checking DKIM Record...'));
  let dkimFound = false;
  
  for (const selector of DKIM_SELECTORS) {
    try {
      const dkimDomain = `${selector}._domainkey.${DOMAIN}`;
      const records = await resolveTxt(dkimDomain);
      
      if (records.length > 0) {
        console.log(chalk.green(`✅ DKIM: CORRECTLY IMPLEMENTED (selector: ${selector})`));
        console.log(chalk.gray(`  Record found at: ${dkimDomain}`));
        dkimFound = true;
        break;
      }
    } catch (error) {
      // Continue to the next selector
    }
  }
  
  if (!dkimFound) {
    console.log(chalk.red('❌ DKIM: NOT FOUND'));
    console.log(chalk.white('  No DKIM record found. Implement the DKIM record provided by Brevo.'));
    allPassed = false;
  }
  
  // Check DMARC
  console.log(chalk.yellow('\n🔍 Checking DMARC Record...'));
  try {
    const dmarcDomain = `_dmarc.${DOMAIN}`;
    const records = await resolveTxt(dmarcDomain);
    
    if (records.length === 0) {
      console.log(chalk.red('❌ DMARC: NOT FOUND'));
      console.log(chalk.white('  Your DMARC record has not been implemented or has not propagated yet.'));
      allPassed = false;
    } else {
      const dmarcRecord = records[0][0];
      
      if (!dmarcRecord.startsWith('v=DMARC1')) {
        console.log(chalk.red('❌ DMARC: INCORRECT FORMAT'));
        console.log(chalk.white('  Your DMARC record does not have the correct format.'));
        allPassed = false;
      } else {
        console.log(chalk.green('✅ DMARC: CORRECTLY IMPLEMENTED'));
        console.log(chalk.gray(`  Record: ${dmarcRecord}`));
        
        // Check policy
        const policyMatch = dmarcRecord.match(/p=([^;]+)/);
        const policy = policyMatch ? policyMatch[1] : 'unknown';
        
        if (policy === 'none') {
          console.log(chalk.blue('ℹ️ DMARC Policy: Monitoring Only (none)'));
          console.log(chalk.white('  This is a good starting policy. After testing, consider upgrading to quarantine or reject.'));
        } else if (policy === 'quarantine') {
          console.log(chalk.blue('ℹ️ DMARC Policy: Quarantine'));
          console.log(chalk.white('  Emails that fail authentication will be sent to spam folders.'));
        } else if (policy === 'reject') {
          console.log(chalk.green('ℹ️ DMARC Policy: Reject'));
          console.log(chalk.white('  Strongest protection. Emails that fail authentication will be rejected.'));
        }
      }
    }
  } catch (error) {
    console.log(chalk.red(`❌ DMARC: ERROR - ${error.message}`));
    allPassed = false;
  }
  
  // Final assessment
  console.log(chalk.yellow('\n📋 VERIFICATION SUMMARY'));
  if (allPassed) {
    console.log(chalk.green('✅ SUCCESS: All authentication DNS records are correctly implemented!'));
    console.log(chalk.white('  Your email authentication setup is complete. You should see improved email deliverability.'));
    console.log(chalk.white('  Next steps:'));
    console.log(chalk.white('  1. Run a real email delivery test'));
    console.log(chalk.white('  2. Monitor deliverability for a few weeks'));
    console.log(chalk.white('  3. Consider upgrading your DMARC policy after successful testing'));
  } else {
    console.log(chalk.red('❌ INCOMPLETE: Some authentication records are missing or incorrect.'));
    console.log(chalk.white('  Review the results above and fix any issues indicated.'));
    console.log(chalk.white('  After making changes, wait 24-48 hours for DNS propagation before testing again.'));
    console.log(chalk.white('  Refer to the implementation guides for detailed instructions.'));
  }
}

// Run all checks
runAllChecks().catch(error => {
  console.error('Unexpected error:', error);
});
