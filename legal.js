/* ============================================================
   Legal documents — single source of truth.
   Used both in-app (Settings sheets) and by legal.html standalone pages.

   EDIT THESE TWO CONSTANTS before publishing:
   ============================================================ */
var LEGAL_CONTACT = 'reynikg@gmail.com';
var LEGAL_UPDATED = '28 July 2026';
var LEGAL_APP_NAME = 'Workout Tracker';

var LEGAL = {
  privacy: {
    title: 'Privacy Policy',
    short: 'What we collect. Short version: nothing.',
    body: `
      <p class="lead">${LEGAL_APP_NAME} is built so that your training data never leaves your device. We do not run servers that receive your data, and we have no way to see what you log.</p>

      <h3>Information we collect</h3>
      <p><strong>None.</strong> ${LEGAL_APP_NAME} does not collect, transmit, sell, or share any personal information. There are no user accounts, no sign-up, no email collection, and no advertising or analytics software in the app.</p>

      <h3>Information you create</h3>
      <p>The workouts, exercises, dates and body-weight entries you enter are stored locally on your own device using your browser's local storage. This information:</p>
      <ul>
        <li>stays on the device where you entered it;</li>
        <li>is not uploaded to us or to any third party;</li>
        <li>is not synchronised between your devices;</li>
        <li>is not accessible to the developer.</li>
      </ul>
      <p>You can export a copy of your data at any time from Settings, and you can permanently erase all of it using Settings → Erase all data. Uninstalling the app, or clearing your browser's site data, may also delete it.</p>

      <h3>Health data</h3>
      <p>Body-weight entries and exercise logs stay on your device under the same terms as everything else. ${LEGAL_APP_NAME} does not read from or write to Apple Health, Google Fit, or any other health platform, and does not request access to them.</p>

      <h3>Third parties</h3>
      <p>${LEGAL_APP_NAME} contains no third-party analytics, advertising, tracking or crash-reporting services. No data is shared with anyone, because no data is collected.</p>
      <p>If you access ${LEGAL_APP_NAME} as a website, the provider hosting those files may record standard technical request logs (such as IP address and browser type) as part of serving the page. That logging is performed by the hosting provider under its own privacy policy and is not created, controlled or accessed by us.</p>

      <h3>Children</h3>
      <p>${LEGAL_APP_NAME} is not directed at children under 13. Since no personal information is collected from anyone, none is collected from children.</p>

      <h3>Changes to this policy</h3>
      <p>If this policy changes, the revised version will be published here with a new "last updated" date. Material changes will be reflected in the app.</p>

      <h3>Contact</h3>
      <p>Questions about this policy: <a href="mailto:${LEGAL_CONTACT}">${LEGAL_CONTACT}</a>.</p>
    `,
  },

  terms: {
    title: 'Terms of Use',
    short: 'The agreement covering your use of the app.',
    body: `
      <p class="lead">By using ${LEGAL_APP_NAME} you agree to these terms. If you do not agree, please do not use the app.</p>

      <h3>Licence</h3>
      <p>You are granted a personal, non-exclusive, non-transferable, revocable licence to use ${LEGAL_APP_NAME} for your own personal, non-commercial fitness tracking. You may not resell the app or offer it as a paid service to others.</p>

      <h3>Your responsibilities</h3>
      <ul>
        <li>You are responsible for the accuracy of the information you enter.</li>
        <li>You are responsible for keeping your own backups. Use Settings → Export backup regularly.</li>
        <li>You agree not to misuse the app, attempt to disrupt it, or use it for any unlawful purpose.</li>
      </ul>

      <h3>Your data and backups</h3>
      <p>${LEGAL_APP_NAME} stores your entries only on your device. We do not hold a copy and therefore cannot restore your data if it is lost. Data may be lost if you clear your browser or site data, uninstall the app, or if the device is lost, reset or damaged. <strong>You are solely responsible for maintaining backups of anything you would not want to lose.</strong></p>

      <h3>No warranty</h3>
      <p>${LEGAL_APP_NAME} is provided "as is" and "as available", without warranties of any kind, whether express or implied, including but not limited to fitness for a particular purpose, accuracy, or uninterrupted availability. We do not warrant that the app will be error-free or that any calculation or statistic it displays is accurate.</p>

      <h3>Limitation of liability</h3>
      <p>To the maximum extent permitted by law, the developer shall not be liable for any injury, loss of data, loss of profits, or any indirect, incidental, special or consequential damages arising from your use of, or inability to use, ${LEGAL_APP_NAME}.</p>

      <h3>Intellectual property</h3>
      <p>The app's design, code and branding remain the property of the developer, subject to the licence terms distributed with the source code. The workout data you enter remains yours.</p>

      <h3>Changes and termination</h3>
      <p>These terms may be updated from time to time; the current version is always available here. We may modify or discontinue the app at any time. Your continued use after a change constitutes acceptance of the revised terms.</p>

      <h3>Contact</h3>
      <p>Questions about these terms: <a href="mailto:${LEGAL_CONTACT}">${LEGAL_CONTACT}</a>.</p>
    `,
  },

  health: {
    title: 'Health Disclaimer',
    short: 'Important — read before training.',
    body: `
      <p class="lead"><strong>${LEGAL_APP_NAME} is a logbook, not a medical device and not a source of medical or fitness advice.</strong></p>

      <h3>Not medical advice</h3>
      <p>The content, statistics, records and summaries shown in ${LEGAL_APP_NAME} are for general informational and record-keeping purposes only. They are not medical advice, diagnosis or treatment, and must not be relied upon as a substitute for consultation with a qualified physician, physiotherapist, registered dietitian or certified trainer.</p>

      <h3>Consult a professional first</h3>
      <p>Always speak with your doctor before beginning, changing or intensifying any exercise programme, particularly if you:</p>
      <ul>
        <li>have a heart condition, high blood pressure, diabetes or any chronic illness;</li>
        <li>are pregnant, recently gave birth, or are recovering from surgery or injury;</li>
        <li>experience chest pain, dizziness, shortness of breath or fainting during exertion;</li>
        <li>take medication that affects heart rate, blood pressure or balance.</li>
      </ul>

      <h3>Assumption of risk</h3>
      <p>Physical exercise — particularly resistance training with free weights or machines — carries an inherent risk of serious injury or death. By using ${LEGAL_APP_NAME} you acknowledge that you exercise entirely at your own risk, and that you, not the developer, are responsible for your training decisions, your loads, your technique and your safety.</p>
      <p>Recording a weight, rep count or progression in this app is not a recommendation to attempt it. Never lift beyond your capability, always use appropriate safety equipment, and use a spotter where appropriate.</p>

      <h3>Stop if something is wrong</h3>
      <p>If you feel pain, faintness, dizziness or any unusual symptom while exercising, stop immediately and seek medical attention. <strong>If you believe you are experiencing a medical emergency, call your local emergency number without delay.</strong></p>

      <h3>Body weight tracking</h3>
      <p>The body-weight feature is a simple log. It does not assess whether a weight is healthy for you, and it is not intended to support or encourage disordered eating or unhealthy weight control. If you have concerns about your weight or your relationship with food or exercise, please speak with your doctor or a qualified professional.</p>

      <h3>No liability</h3>
      <p>To the maximum extent permitted by law, the developer accepts no liability for any injury, illness or loss arising from the use of this app or from any exercise programme you undertake while using it.</p>
    `,
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = { LEGAL, LEGAL_CONTACT, LEGAL_UPDATED };
