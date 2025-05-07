#!/usr/bin/env node

/**
 * DNS Record Generator for Email Authentication
 * 
 * This script generates the necessary DNS records for proper email authentication
 * for Eli's Bar Mitzvah website. It creates DNS records for:
 * - SPF (Sender Policy Framework)
 * - DMARC (Domain-based Message Authentication, Reporting & Conformance)
 * - Return-Path (Bounce handling)
 * 
 * The DKIM records must be generated through the Brevo dashboard.
 * 
 * Usage: 
 *   node generate-dns-records.js
 */

const chalk = require('chalk');
const fs = require('fs');
const readline = require('readline');

// Configuration
const DOMAIN = 'elibarkin.com';
const EMAIL = 'jacobsamuelbarkin@gmail.com'; // For DMARC reports

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ASCII Art header
console.log(chalk.blue(`
  ┌───────────────────────────────────────────────┐
  │                                               │
  │  DNS Record Generator for Email Authentication │
  │  Domain: ${DOMAIN}                           │
  │                                               │
  └───────────────────────────────────────────────┘
`));

// Generate SPF record
function generateSpfRecord() {
  return {
    type: 'TXT',
    host: '@',
    value: 'v=spf1 include:spf.sendinblue.com include:_spf.google.com ~all',
    ttl: 3600,
    explanation: 'Authorizes Brevo (Sendinblue) and Google to send emails on behalf of your domain. The ~all means that emails from unauthorized sources should be marked as suspicious but not rejected outright.'
  };
}

// Generate DMARC record
function generateDmarcRecord(reportEmail, policy = 'none') {
  return {
    type: 'TXT',
    host: '_dmarc',
    value: `v=DMARC1; p=${policy}; sp=${policy}; rua=mailto:${reportEmail}; adkim=r; aspf=r; pct=100;`,
    ttl: 3600,
    explanation: `DMARC policy tells receiving mail servers what to do with emails that fail SPF or DKIM checks. The "${policy}" setting means ${policy === 'none' ? 'monitor only (no action taken)' : policy === 'quarantine' ? 'mark as spam' : 'reject the email'}. Reports will be sent to ${reportEmail}.`
  };
}

// Generate Return-Path record
function generateReturnPathRecord() {
  return {
    type: 'CNAME',
    host: 'bounce',
    value: 'bounce.sendinblue.com',
    ttl: 3600,
    explanation: 'Sets up a proper bounce handling domain for your emails. This helps track and handle email bounces correctly.'
  };
}

// Generate domain validation record for Brevo
function generateBrevoValidationRecord() {
  return {
    type: 'TXT',
    host: 'brevo',
    value: '[THIS VALUE WILL BE PROVIDED BY BREVO]',
    ttl: 3600,
    explanation: 'This record verifies your domain ownership with Brevo. You need to get the actual value from the Brevo dashboard when setting up domain authentication.'
  };
}

// Format records as human-readable text
function formatRecords(records) {
  let result = '';
  
  for (const record of records) {
    result += chalk.yellow(`\n🔹 ${record.type} Record: ${record.host}.${DOMAIN}\n`);
    result += chalk.white(`   Value: ${record.value}\n`);
    result += chalk.white(`   TTL: ${record.ttl}\n`);
    result += chalk.gray(`   Purpose: ${record.explanation}\n`);
    
    // Add registrar-specific instructions
    result += chalk.blue(`   Implementation:\n`);
    
    // Common registrars
    result += chalk.white(`     • GoDaddy: DNS Management → Add Record → Type: ${record.type}, Name: ${record.host === '@' ? '@' : record.host}, Value: ${record.value}, TTL: ${record.ttl}\n`);
    result += chalk.white(`     • Namecheap: Advanced DNS → Add New Record → Type: ${record.type}, Host: ${record.host === '@' ? '@' : record.host}, Value: ${record.value}, TTL: ${record.ttl}\n`);
    result += chalk.white(`     • Google Domains: DNS → Manage Custom Records → Create → Type: ${record.type}, Host: ${record.host === '@' ? '@' : record.host}, Data: ${record.value}, TTL: ${record.ttl}\n`);
  }
  
  return result;
}

// Ask user for DMARC policy
function promptForDmarcPolicy() {
  return new Promise((resolve) => {
    console.log(chalk.yellow('\n📋 DMARC Policy Configuration'));
    console.log(chalk.white('DMARC determines what happens to emails that fail authentication checks.'));
    console.log(chalk.white('  1. "none" - Monitor only, emails still delivered (recommended for starting)'));
    console.log(chalk.white('  2. "quarantine" - Mark as spam (intermediate step)'));
    console.log(chalk.white('  3. "reject" - Block completely (strictest policy)'));
    
    rl.question(chalk.blue('\nSelect DMARC policy (1-3) [default: 1]: '), (answer) => {
      let policy = 'none'; // Default
      
      if (answer === '2') {
        policy = 'quarantine';
      } else if (answer === '3') {
        policy = 'reject';
      }
      
      console.log(chalk.green(`Selected DMARC policy: "${policy}"`));
      resolve(policy);
    });
  });
}

// Ask user for email to receive DMARC reports
function promptForReportEmail() {
  return new Promise((resolve) => {
    rl.question(chalk.blue(`\nEmail to receive DMARC reports [default: ${EMAIL}]: `), (answer) => {
      const email = answer.trim() || EMAIL;
      resolve(email);
    });
  });
}

// Generate all records and output
async function generateAllRecords() {
  try {
    console.log(chalk.yellow('\n📋 Generating DNS Records for Email Authentication...'));
    
    // Get user inputs
    const reportEmail = await promptForReportEmail();
    const dmarcPolicy = await promptForDmarcPolicy();
    
    // Generate records
    const spfRecord = generateSpfRecord();
    const dmarcRecord = generateDmarcRecord(reportEmail, dmarcPolicy);
    const returnPathRecord = generateReturnPathRecord();
    const brevoValidationRecord = generateBrevoValidationRecord();
    
    const allRecords = [spfRecord, dmarcRecord, returnPathRecord, brevoValidationRecord];
    
    // Print records
    console.log(chalk.yellow('\n📄 DNS Records for Email Authentication:'));
    console.log(formatRecords(allRecords));
    
    // DKIM notice
    console.log(chalk.yellow('\n📝 DKIM Setup Instructions:'));
    console.log(chalk.white('  DKIM records must be generated through your Brevo account:'));
    console.log(chalk.white('  1. Log in to your Brevo account (https://app.brevo.com)'));
    console.log(chalk.white('  2. Go to Settings → Senders & IPs → Manage Domains'));
    console.log(chalk.white('  3. Click "Add a new domain" and enter your domain name'));
    console.log(chalk.white('  4. Follow the wizard to generate and add DKIM records'));
    
    // Generate instructions file
    const recordsText = `
# DNS Records for ${DOMAIN} Email Authentication

> Generated on: ${new Date().toISOString().split('T')[0]}

Follow these instructions to set up the required DNS records for proper email authentication.
This will improve email deliverability and prevent your emails from being marked as spam.

## SPF Record

**Type:** ${spfRecord.type}
**Host/Name:** ${spfRecord.host === '@' ? '@' : spfRecord.host}
**Value:** ${spfRecord.value}
**TTL:** ${spfRecord.ttl}

*Purpose:* ${spfRecord.explanation}

## DMARC Record

**Type:** ${dmarcRecord.type}
**Host/Name:** ${dmarcRecord.host}
**Value:** ${dmarcRecord.value}
**TTL:** ${dmarcRecord.ttl}

*Purpose:* ${dmarcRecord.explanation}

## Return-Path (Bounce) Record

**Type:** ${returnPathRecord.type}
**Host/Name:** ${returnPathRecord.host}
**Value:** ${returnPathRecord.value}
**TTL:** ${returnPathRecord.ttl}

*Purpose:* ${returnPathRecord.explanation}

## Brevo Domain Validation Record

**Type:** ${brevoValidationRecord.type}
**Host/Name:** ${brevoValidationRecord.host}
**Value:** ${brevoValidationRecord.value} (get this from Brevo dashboard)
**TTL:** ${brevoValidationRecord.ttl}

*Purpose:* ${brevoValidationRecord.explanation}

## DKIM Setup

DKIM records must be generated through your Brevo account:

1. Log in to your Brevo account (https://app.brevo.com)
2. Go to Settings → Senders & IPs → Manage Domains
3. Click "Add a new domain" and enter your domain name (${DOMAIN})
4. Follow the wizard to generate and add DKIM records

## After Implementation

After adding these DNS records:

1. Wait 24-48 hours for DNS propagation
2. Run \`node enhanced-email-deliverability-test.js\` to verify your setup
3. Test actual email delivery with \`node test-email-delivery.js\`

Refer to the email-implementation-guide.md for more detailed instructions.
`;
    
    fs.writeFileSync('dns-records-for-email.md', recordsText);
    console.log(chalk.green('\n✅ Instructions saved to dns-records-for-email.md'));
    
    console.log(chalk.blue('\n📱 Next Steps:'));
    console.log(chalk.white('  1. Log in to your domain registrar'));
    console.log(chalk.white('  2. Add the DNS records as specified above'));
    console.log(chalk.white('  3. Wait 24-48 hours for DNS propagation'));
    console.log(chalk.white('  4. Run enhanced-email-deliverability-test.js to verify your setup'));
    
  } catch (error) {
    console.error(chalk.red(`\n❌ An error occurred: ${error.message}`));
  } finally {
    rl.close();
  }
}

// Run the generator
generateAllRecords();
