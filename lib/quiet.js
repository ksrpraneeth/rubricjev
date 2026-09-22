// The platform's request helpers call Node's deprecated url.parse(), which logs a warning at level "error"
// on every cold start and buries real errors in the production logs. Our code never uses it.
process.noDeprecation = true;
