#!/usr/bin/env node

/**
 * Email Deliverability Toolkit Runner
 * 
 * This is a convenient script that helps run all the email deliverability tools
 * from a single command. It provides a menu-based interface to access all the
 * tools and guides available in the Email Deliverability Toolkit.
 * 
 * Usage:
 *   node email-toolkit.js
 */

const readline = require('readline');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ASCII Art header
console.log(`
  ┌───────────────────────────────────────────────┐
  │                                               │
  │  🚀 Email Deliverability Toolkit for          │
  │     Eli's Be Mitzvah Website                 │
  │                                               │
  └───────────────────────────────────────────────┘
`);

// Main menu
function showMainMenu() {
  console.log(`
📋 Main Menu:

  1️⃣  Setup & Configuration
  2️⃣  Testing & Verification
  3️⃣  Documentation & Guides
  4️⃣  About This Toolkit
  5️⃣  Exit
`);

  rl.question('Select an option (1-5): ', (answer) => {
    switch (answer) {
      case '1':
        showSetupMenu();
        break;
      case '2':
        showTestingMenu();
        break;
      case '3':
        showDocumentationMenu();
        break;
      case '4':
        showAboutInfo();
        break;
      case '5':
        console.log('\n👋 Goodbye! Remember to verify your email setup regularly.');
        rl.close();
        break;
      default:
        console.log('\n❌ Invalid option. Please try again.');
        showMainMenu();
    }
  });
}

// Setup & Configuration menu
function showSetupMenu() {
  console.log(`
🔧 Setup & Configuration:

  1️⃣  Generate DNS Records (SPF, DMARC, etc.)
  2️⃣  Check Current DNS Configuration
  3️⃣  Install Required Dependencies
  4️⃣  Back to Main Menu
`);

  rl.question('Select an option (1-4): ', (answer) => {
    switch (answer) {
      case '1':
        runTool('generate-dns-records.js', 'Generating DNS records...');
        break;
      case '2':
        runTool('enhanced-email-deliverability-test.js', 'Checking DNS configuration...');
        break;
      case '3':
        installDependencies();
        break;
      case '4':
        showMainMenu();
        break;
      default:
        console.log('\n❌ Invalid option. Please try again.');
        showSetupMenu();
    }
  });
}

// Testing & Verification menu
function showTestingMenu() {
  console.log(`
🧪 Testing & Verification:

  1️⃣  Test Email Authentication (DNS Check)
  2️⃣  Quick DNS Authentication Verification
  3️⃣  Test Actual Email Delivery 
  4️⃣  View Latest Test Report
  5️⃣  Generate Test Email Template
  6️⃣  Back to Main Menu
`);

  rl.question('Select an option (1-6): ', (answer) => {
    switch (answer) {
      case '1':
        runTool('enhanced-email-deliverability-test.js', 'Testing email authentication...');
        break;
      case '2':
        runTool('verify-dns-authentication.js', 'Verifying DNS authentication records...');
        break;
      case '3':
        runEmailDeliveryTest();
        break;
      case '4':
        viewLatestReport();
        break;
      case '5':
        console.log('\n📧 To generate a test email template:');
        console.log('   Please run "node test-email-delivery.js" and follow the prompts.\n');
        setTimeout(() => showTestingMenu(), 3000);
        break;
      case '6':
        showMainMenu();
        break;
      default:
        console.log('\n❌ Invalid option. Please try again.');
        showTestingMenu();
    }
  });
}

// Documentation & Guides menu
function showDocumentationMenu() {
  console.log(`
📚 Documentation & Guides:

  1️⃣  Email Deliverability Guide
  2️⃣  Email Authentication Technical Reference
  3️⃣  Email Implementation Checklist
  4️⃣  Email Best Practices
  5️⃣  Email Deliverability FAQ & Troubleshooting
  6️⃣  Firebase Setup Guide
  7️⃣  Documentation Index (Overview)
  8️⃣  Legacy Guides
  9️⃣  Back to Main Menu
`);

  rl.question('Select an option (1-9): ', (answer) => {
    switch (answer) {
      case '1':
        openDocument('docs/EMAIL-DELIVERABILITY-GUIDE.md');
        break;
      case '2':
        openDocument('docs/EMAIL-AUTHENTICATION-TECHNICAL.md');
        break;
      case '3':
        openDocument('docs/EMAIL-IMPLEMENTATION-CHECKLIST-V2.md');
        break;
      case '4':
        openDocument('docs/EMAIL-BEST-PRACTICES.md');
        break;
      case '5':
        openDocument('docs/EMAIL-DELIVERABILITY-FAQ.md');
        break;
      case '6':
        openDocument('docs/setup/FIREBASE-SETUP.md');
        break;
      case '7':
        openDocument('docs/EMAIL-DOCUMENTATION-INDEX.md');
        break;
      case '8':
        showLegacyGuidesMenu();
        break;
      case '9':
        showMainMenu();
        break;
      default:
        console.log('\n❌ Invalid option. Please try again.');
        showDocumentationMenu();
    }
  });
}

// About this toolkit
function showAboutInfo() {
  console.log(`
ℹ️ About This Toolkit:

  📌 Email Deliverability Toolkit for Eli's Be Mitzvah Website
  📌 Version: 2.1
  📌 Created: May 7, 2025
  
  This toolkit helps ensure all emails related to Eli's Be Mitzvah
  reach your guests' inboxes and avoid spam folders.
  
  It includes tools for:
  • Setting up proper email authentication (SPF, DKIM, DMARC)
  • Testing email deliverability
  • Following best practices for email content and sending
  • Troubleshooting common email issues
  
  For detailed instructions, refer to the documentation guides.
`);

  rl.question('\nPress Enter to return to the main menu...', () => {
    showMainMenu();
  });
}

// Run a tool
function runTool(toolName, message) {
  console.log(`\n🔄 ${message}`);
  
  const child = exec(`node ${toolName}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`\n❌ Error: ${error.message}`);
      console.log('\nReturning to menu in 5 seconds...');
      setTimeout(() => showMainMenu(), 5000);
      return;
    }
    
    if (stderr) {
      console.error(`\n⚠️ Warning: ${stderr}`);
    }
    
    // Tool completed successfully
    console.log('\nReturning to menu in 3 seconds...');
    setTimeout(() => showMainMenu(), 3000);
  });
  
  // Pipe the tool's output to the current process
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
}

// Run email delivery test with API key prompt
function runEmailDeliveryTest() {
  console.log('\n📧 Testing actual email delivery requires your Brevo API key.');
  
  rl.question('Enter your Brevo API key (input will be hidden): ', (apiKey) => {
    if (!apiKey || apiKey.trim() === '') {
      console.log('\n❌ API key is required. Please try again.');
      setTimeout(() => showTestingMenu(), 2000);
      return;
    }
    
    console.log('\n🔄 Running email delivery test...');
    
    // Set environment variable and run the tool
    const env = { ...process.env, BREVO_API_KEY: apiKey };
    const child = exec('node test-email-delivery.js', { env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`\n❌ Error: ${error.message}`);
        console.log('\nReturning to menu in 5 seconds...');
        setTimeout(() => showTestingMenu(), 5000);
        return;
      }
      
      if (stderr) {
        console.error(`\n⚠️ Warning: ${stderr}`);
      }
      
      // Tool completed successfully
      console.log('\nReturning to menu in 3 seconds...');
      setTimeout(() => showTestingMenu(), 3000);
    });
    
    // Pipe the tool's output to the current process
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  });
  
  // Hide input (doesn't work perfectly in all environments)
  rl.stdoutMuted = true;
  rl._writeToOutput = function _writeToOutput(stringToWrite) {
    if (rl.stdoutMuted)
      rl.output.write('*');
    else
      rl.output.write(stringToWrite);
  };
}

// Install dependencies
function installDependencies() {
  console.log('\n🔄 Installing required dependencies...');
  
  exec('npm install --prefix . axios chalk fs readline', (error, stdout, stderr) => {
    if (error) {
      console.error(`\n❌ Error: ${error.message}`);
      console.log('\nReturning to menu in 5 seconds...');
      setTimeout(() => showSetupMenu(), 5000);
      return;
    }
    
    console.log('\n✅ Dependencies installed successfully!');
    console.log('\nReturning to menu in 3 seconds...');
    setTimeout(() => showSetupMenu(), 3000);
  });
}

// View latest report
function viewLatestReport() {
  const reportPath = path.join(process.cwd(), 'email-deliverability-report.json');
  
  if (!fs.existsSync(reportPath)) {
    console.log('\n❌ No test report found. Please run a test first.');
    console.log('\nReturning to menu in 3 seconds...');
    setTimeout(() => showTestingMenu(), 3000);
    return;
  }
  
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    console.log(`
📊 Latest Test Report:

  Domain: ${report.domain}
  Email: ${report.email}
  Date: ${new Date(report.timestamp).toLocaleString()}
  Score: ${report.score}% - ${report.rating}
  
  Test Results:
  • SPF: ${report.tests.spf.pass ? '✅ Pass' : '❌ Fail'}
  • DKIM: ${report.tests.dkim.pass ? '✅ Pass' : '❌ Fail'}
  • DMARC: ${report.tests.dmarc.pass ? '✅ Pass' : '❌ Fail'}
  • MX Records: ${report.tests.mx.pass ? '✅ Pass' : '❌ Fail'}
  • Return-Path: ${report.tests.returnPath.pass ? '✅ Pass' : '❌ Fail'}
`);
    
    rl.question('\nPress Enter to return to the Testing menu...', () => {
      showTestingMenu();
    });
  } catch (error) {
    console.error(`\n❌ Error reading report: ${error.message}`);
    console.log('\nReturning to menu in 3 seconds...');
    setTimeout(() => showTestingMenu(), 3000);
  }
}

// Open a document
function openDocument(docName) {
  const docPath = path.join(process.cwd(), docName);
  
  if (!fs.existsSync(docPath)) {
    console.log(`\n❌ Document ${docName} not found.`);
    console.log('\nReturning to menu in 3 seconds...');
    setTimeout(() => showDocumentationMenu(), 3000);
    return;
  }
  
  const content = fs.readFileSync(docPath, 'utf8');
  
  // Clear the console for better readability
  console.clear();
  
  console.log(`
📑 ${docName}
${'='.repeat(docName.length + 4)}

${content}
`);
  
  rl.question('\nPress Enter to return to the Documentation menu...', () => {
    console.clear();
    showDocumentationMenu();
  });
}

// Legacy Guides menu
function showLegacyGuidesMenu() {
  console.log(`
📜 Legacy Documentation:

  1️⃣  Original Implementation Guide
  2️⃣  Original Authentication Guide
  3️⃣  Original Best Practices Guide
  4️⃣  Original FAQ
  5️⃣  Original Implementation Checklist
  6️⃣  Brevo Verification Guide
  7️⃣  Post-Implementation Testing Guide
  8️⃣  Back to Documentation Menu
`);

  rl.question('Select an option (1-8): ', (answer) => {
    switch (answer) {
      case '1':
        openDocument('docs/archive/email-implementation-guide.md');
        break;
      case '2':
        openDocument('docs/archive/email-authentication-guide.md');
        break;
      case '3':
        openDocument('docs/archive/email-deliverability-best-practices.md');
        break;
      case '4':
        openDocument('docs/archive/email-deliverability-faq.md');
        break;
      case '5':
        openDocument('docs/archive/EMAIL-IMPLEMENTATION-CHECKLIST.md');
        break;
      case '6':
        openDocument('docs/archive/brevo-verification-guide.md');
        break;
      case '7':
        openDocument('docs/archive/post-implementation-testing.md');
        break;
      case '8':
        showDocumentationMenu();
        break;
      default:
        console.log('\n❌ Invalid option. Please try again.');
        showLegacyGuidesMenu();
    }
  });
}

// Start the application
showMainMenu();
