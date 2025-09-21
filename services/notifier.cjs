// Simple stub that logs a confirmation message.
// Swap later for nodemailer or an SMS provider if desired.
async function notifyCustomer(customer, message) {
  const mode = (customer.preferredContact || "email").toLowerCase();
  const dest = mode === "phone" ? customer.phone : customer.email;
  console.log(`📣 Notify via ${mode} -> ${dest}: ${message}`);
  return true;
}
module.exports = { notifyCustomer };
