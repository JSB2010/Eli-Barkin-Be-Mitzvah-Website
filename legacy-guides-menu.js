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
        openDocument('email-implementation-guide.md');
        break;
      case '2':
        openDocument('email-authentication-guide.md');
        break;
      case '3':
        openDocument('email-deliverability-best-practices.md');
        break;
      case '4':
        openDocument('email-deliverability-faq.md');
        break;
      case '5':
        openDocument('EMAIL-IMPLEMENTATION-CHECKLIST.md');
        break;
      case '6':
        openDocument('brevo-verification-guide.md');
        break;
      case '7':
        openDocument('post-implementation-testing.md');
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
