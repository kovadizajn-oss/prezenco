export default function PrivacyPage() {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-6 py-16">
          
          <div className="mb-10">
            <a href="/" className="text-sm text-green-600 hover:underline">← Back to Zummo</a>
          </div>
  
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-10">Last updated: May 21, 2026</p>
  
          <div className="space-y-8 text-gray-700 text-sm leading-relaxed">
  
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Who we are</h2>
              <p>Zummo is an employee time tracking service operated at zummo.app. When you use Zummo, we act as a data processor on behalf of your employer (the data controller). For questions about this policy, contact us at contact@zummo.com.</p>
            </section>
  
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. What data we collect</h2>
              <p className="mb-2">We collect the following personal data:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Your full name and email address</li>
                <li>Your GPS location at the time of check-in and check-out</li>
                <li>Your work hours (check-in and check-out timestamps)</li>
                <li>Your device information (browser type, operating system)</li>
              </ul>
            </section>
  
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Why we collect it</h2>
              <p className="mb-2">We collect this data solely to provide the time tracking service to your employer. Specifically:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Your name and email are used to identify your account</li>
                <li>Your GPS location is used only to verify you are at the workplace when checking in</li>
                <li>Your work hours are recorded for attendance and payroll purposes</li>
              </ul>
              <p className="mt-2">We do not track your location continuously — only at the moment you tap check in.</p>
            </section>
  
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Who has access to your data</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Your employer (the business owner who invited you) can see your name, check-in/out times, and hours worked</li>
                <li>Zummo staff may access data for support and maintenance purposes</li>
                <li>We do not sell your data to third parties</li>
              </ul>
            </section>
  
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Third party processors</h2>
              <p className="mb-2">We use the following third party services to operate Zummo:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Supabase</strong> — database and authentication (data stored in EU)</li>
                <li><strong>Vercel</strong> — hosting and deployment</li>
                <li><strong>Stripe</strong> — payment processing (for business owners only)</li>
              </ul>
            </section>
  
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. How long we keep your data</h2>
              <p>Your data is retained for as long as your employer maintains an active account on Zummo. If your employer deletes your account, your personal data is deleted within 30 days.</p>
            </section>
  
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Your rights under GDPR</h2>
              <p className="mb-2">As an EU resident you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Lodge a complaint with your national data protection authority</li>
              </ul>
              <p className="mt-2">To exercise these rights, contact us at contact@zummo.com.</p>
            </section>
  
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Cookies</h2>
              <p>Zummo uses only essential cookies required for authentication. We do not use tracking or advertising cookies.</p>
            </section>
  
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Changes to this policy</h2>
              <p>We may update this policy from time to time. We will notify users of significant changes by email. Continued use of Zummo after changes constitutes acceptance of the updated policy.</p>
            </section>
  
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contact</h2>
              <p>For any privacy-related questions or requests, contact us at <a href="mailto:contact@zummo.com" className="text-green-600 hover:underline">contact@zummo.com</a>.</p>
            </section>
  
          </div>
        </div>
      </div>
    )
  }