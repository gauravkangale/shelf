const fs = require('fs');
const path = '/Users/gauravkangale/Desktop/homepage/shelf/login.html';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace Step 3 HTML
const step3Target = `<!-- ── STEP 3: USERNAME SELECTION ── -->
        <div id="step3" class="hidden">
          <p style="font-family:var(--sans);font-size:12px;color:#7a7263;margin-bottom:16px;line-height:1.6;">
            Choose a unique username to activate your borrower card.
          </p>
          <div class="field">
            <input type="text" id="usernameInput" placeholder=" " oninput="this.value = this.value.replace(/\\s/g, '')"
              onkeydown="if(event.key === ' ') event.preventDefault();">
            <label for="usernameInput">Username</label>
          </div>
          <div class="field" id="newPasswordField" style="margin-top: 18px;">
            <input type="password" id="newPasswordInput" placeholder=" " autocomplete="new-password">
            <label for="newPasswordInput">Create Password (Optional)</label>
          </div>
          <div class="msg-line error" id="step3Error">
            <span class="msg-dot"></span>
            <span id="step3ErrorMsg">Username is already taken.</span>
          </div>
          <div class="msg-line success" id="step3Success">
            <span class="msg-dot"></span>
            <span>Card activated! Redirecting…</span>
          </div>
          <div class="actions">
            <span></span>
            <button class="stamp-btn" id="activateBtn" onclick="handleActivateCard()">
              <span id="activateBtnText">Activate Card</span>
              <div class="spinner" id="activateSpinner"></div>
            </button>
          </div>
        </div>`;
const step3Replacement = `<!-- ── STEP 3: USERNAME SELECTION ── -->
        <div id="step3" class="hidden">
          <p style="font-family:var(--sans);font-size:12px;color:#7a7263;margin-bottom:16px;line-height:1.6;">
            Complete your borrower card details to activate your account.
          </p>
          <div class="field">
            <input type="text" id="usernameInput" placeholder=" " oninput="this.value = this.value.replace(/\\s/g, '')"
              onkeydown="if(event.key === ' ') event.preventDefault();">
            <label for="usernameInput">Username</label>
          </div>
          <div class="field" style="margin-top: 18px;">
            <input type="text" id="fullNameInput3" placeholder=" ">
            <label for="fullNameInput3">Full Name</label>
          </div>
          <div class="field" style="margin-top: 18px;">
            <input type="password" id="newPasswordInput" placeholder=" " autocomplete="new-password">
            <label for="newPasswordInput">Create Password</label>
          </div>
          <div class="field" id="emailField3" style="margin-top: 18px;">
            <input type="email" id="emailInput3" placeholder=" ">
            <label for="emailInput3">Email Address</label>
          </div>
          <div class="field" id="phoneField3" style="margin-top: 18px;">
            <input type="tel" id="phoneInput3" placeholder=" ">
            <label for="phoneInput3">Phone Number</label>
          </div>
          <div class="field" style="margin-top: 18px;">
            <input type="text" id="bioInput3" placeholder=" ">
            <label for="bioInput3">Bio (Optional)</label>
          </div>
          <div class="msg-line error" id="step3Error">
            <span class="msg-dot"></span>
            <span id="step3ErrorMsg">Username is already taken.</span>
          </div>
          <div class="msg-line success" id="step3Success">
            <span class="msg-dot"></span>
            <span>Card activated! Redirecting…</span>
          </div>
          <div class="actions">
            <span></span>
            <button class="stamp-btn" id="activateBtn" onclick="handleActivateCard()">
              <span id="activateBtnText">Activate Card</span>
              <div class="spinner" id="activateSpinner"></div>
            </button>
          </div>
        </div>`;
code = code.replace(step3Target, step3Replacement);

// 2. Replace Forgot Links
const forgotLinksTarget = `<div style="text-align: right; margin-bottom: 20px;" id="forgotContainer">
              <button type="button" class="resend-link" id="forgotBtn" onclick="showForgotModal()"
                style="font-size: 11px; background: none; border: none; padding: 0; color: var(--brass); cursor: pointer; text-decoration: underline;">Forgot Username?</button>
            </div>`;
const forgotLinksReplacement = `<div style="display: flex; justify-content: space-between; margin-bottom: 20px;" id="forgotContainer">
              <button type="button" class="resend-link" onclick="showForgotModal()" style="font-size: 11px; background: none; border: none; padding: 0; color: var(--brass); cursor: pointer; text-decoration: underline;">Forgot Username?</button>
              <button type="button" class="resend-link" onclick="showForgotPassword()" style="font-size: 11px; background: none; border: none; padding: 0; color: var(--brass); cursor: pointer; text-decoration: underline;">Forgot Password?</button>
            </div>`;
code = code.replace(forgotLinksTarget, forgotLinksReplacement);

// 3. Add Forgot Password HTML after forgotView
const forgotViewTarget = `</button>
          </div>
        </div>`;
const forgotViewReplacement = `</button>
          </div>
        </div>
        
        <!-- ── FORGOT PASSWORD VIEW ── -->
        <div id="forgotPasswordView" class="hidden">
          <p style="font-family:var(--sans);font-size:12px;color:#7a7263;margin-bottom:16px;line-height:1.6;" id="fpDesc">
            Enter your email to receive an OTP to reset your password.
          </p>
          <div class="field" id="fpEmailField">
            <input type="email" id="fpEmailInput" placeholder=" ">
            <label for="fpEmailInput">Digital Mail Address</label>
          </div>
          
          <div id="fpOtpSection" class="hidden" style="margin-top: 16px;">
            <p style="font-family:var(--sans);font-size:12px;color:#7a7263;margin-bottom:8px;">Enter 6-digit OTP:</p>
            <div class="otp-group" id="fpOtpGroup" style="margin-bottom: 16px;">
              <input class="otp-box fp-otp-box" id="fpOtp0" type="text" inputmode="numeric" maxlength="1">
              <input class="otp-box fp-otp-box" id="fpOtp1" type="text" inputmode="numeric" maxlength="1">
              <input class="otp-box fp-otp-box" id="fpOtp2" type="text" inputmode="numeric" maxlength="1">
              <input class="otp-box fp-otp-box" id="fpOtp3" type="text" inputmode="numeric" maxlength="1">
              <input class="otp-box fp-otp-box" id="fpOtp4" type="text" inputmode="numeric" maxlength="1">
              <input class="otp-box fp-otp-box" id="fpOtp5" type="text" inputmode="numeric" maxlength="1">
            </div>
            <div class="field">
              <input type="password" id="fpNewPasswordInput" placeholder=" ">
              <label for="fpNewPasswordInput">New Password</label>
            </div>
          </div>

          <div class="msg-line error" id="fpError">
            <span class="msg-dot"></span>
            <span id="fpErrorMsg">Failed.</span>
          </div>
          <div class="msg-line success" id="fpSuccess">
            <span class="msg-dot"></span>
            <span id="fpSuccessMsg">Check your mail!</span>
          </div>
          <div class="actions">
            <button class="ghost-btn" onclick="cancelForgotPassword()">← Back</button>
            <button class="stamp-btn" id="fpBtn" onclick="handleForgotPasswordFlow()">
              <span id="fpBtnText">Send OTP</span>
              <div class="spinner" id="fpSpinner"></div>
            </button>
          </div>
        </div>`;
// Replace the LAST instance of `</button> \n </div> \n </div>` which is the forgotView closing tags.
const parts = code.split(forgotViewTarget);
if(parts.length > 1) {
  const lastPart = parts.pop();
  code = parts.join(forgotViewTarget) + forgotViewReplacement + lastPart;
}


// 4. Replace goToStep3
const jsGoToStep3Target = `    function goToStep3(authUser) {
      tempAuthUser = authUser;
      currentStep = 3;
      step1El.classList.add('hidden');
      step2El.classList.add('hidden');
      googleWrap.classList.add('hidden');
      orDivider.classList.add('hidden');
      document.getElementById('stepDots').style.display = 'none';
      document.getElementById('step3').classList.remove('hidden');
      document.getElementById('switchLine').style.display = 'none';

      const usernameInput = document.getElementById('usernameInput');
      // Pre-fill with a clean name slug
      usernameInput.value = (authUser.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      clearMsg(document.getElementById('step3Error'));
      clearMsg(document.getElementById('step3Success'));
      setTimeout(() => usernameInput.focus(), 100);
    }`;
const jsGoToStep3Replacement = `    function goToStep3(authUser) {
      tempAuthUser = authUser;
      currentStep = 3;
      step1El.classList.add('hidden');
      step2El.classList.add('hidden');
      googleWrap.classList.add('hidden');
      orDivider.classList.add('hidden');
      document.getElementById('stepDots').style.display = 'none';
      document.getElementById('step3').classList.remove('hidden');
      document.getElementById('switchLine').style.display = 'none';

      const usernameInput = document.getElementById('usernameInput');
      const fullNameInput3 = document.getElementById('fullNameInput3');
      const emailInput3 = document.getElementById('emailInput3');
      const phoneInput3 = document.getElementById('phoneInput3');
      const emailField3 = document.getElementById('emailField3');
      const phoneField3 = document.getElementById('phoneField3');
      
      // Pre-fill
      usernameInput.value = (authUser.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      fullNameInput3.value = authUser.name || '';
      
      if (authUser.email) {
        emailInput3.value = authUser.email;
        emailField3.style.display = 'none';
      } else {
        emailField3.style.display = 'block';
      }
      
      if (authUser.phone) {
        phoneInput3.value = authUser.phone;
        phoneField3.style.display = 'none';
      } else {
        phoneField3.style.display = 'block';
      }
      
      clearMsg(document.getElementById('step3Error'));
      clearMsg(document.getElementById('step3Success'));
      setTimeout(() => usernameInput.focus(), 100);
    }`;
code = code.replace(jsGoToStep3Target, jsGoToStep3Replacement);


// 5. Replace handleActivateCard
const jsActivateTarget = `    async function handleActivateCard() {
      const usernameInput = document.getElementById('usernameInput');
      const val = usernameInput.value.trim().toLowerCase();
      const errorEl = document.getElementById('step3Error');
      const errorMsgEl = document.getElementById('step3ErrorMsg');
      const successEl = document.getElementById('step3Success');

      if (!val) {
        showError(errorEl, errorMsgEl, 'Username is required');
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,15}$/.test(val)) {
        showError(errorEl, errorMsgEl, 'Username must be 3-15 characters and contain only letters, numbers, or underscores.');
        return;
      }

      const btn = document.getElementById('activateBtn');
      const spinner = document.getElementById('activateSpinner');
      const btnText = document.getElementById('activateBtnText');

      setBtnLoading(btn, btnText, spinner, true);
      clearMsg(errorEl);

      const { res, data, error } = await safeFetchJson('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${tempAuthUser.token}\`
        },
        body: JSON.stringify({
          name: tempAuthUser.name || val,
          username: val,
          email: tempAuthUser.email || '',
          avatar_url: tempAuthUser.avatar || ''
        })
      });

      setBtnLoading(btn, btnText, spinner, false);

      if (error) {
        showError(errorEl, errorMsgEl, 'Activation failed. Please check connection.');
        return;
      }

      if (!res.ok) {
        showError(errorEl, errorMsgEl, data.error || 'Failed to activate borrower card.');
        return;
      }

      showSuccess(successEl);
      tempAuthUser.username = val;
      setTimeout(() => {
        completeAuth(tempAuthUser);
      }, 1000);
    }`;
const jsActivateReplacement = `    async function handleActivateCard() {
      const usernameInput = document.getElementById('usernameInput');
      const fullNameInput = document.getElementById('fullNameInput3');
      const newPasswordInput = document.getElementById('newPasswordInput');
      const emailInput = document.getElementById('emailInput3');
      const phoneInput = document.getElementById('phoneInput3');
      const bioInput = document.getElementById('bioInput3');

      const username = usernameInput.value.trim().toLowerCase();
      const name = fullNameInput.value.trim();
      const password = newPasswordInput.value;
      const email = emailInput.value.trim().toLowerCase();
      const phone = phoneInput.value.trim();
      const bio = bioInput.value.trim();

      const errorEl = document.getElementById('step3Error');
      const errorMsgEl = document.getElementById('step3ErrorMsg');
      const successEl = document.getElementById('step3Success');

      if (!username || !name || !email || !password) {
        showError(errorEl, errorMsgEl, 'Username, Name, Email, and Password are required');
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
        showError(errorEl, errorMsgEl, 'Username must be 3-15 chars (letters/numbers/_).');
        return;
      }
      if (password.length < 8) {
        showError(errorEl, errorMsgEl, 'Password must be at least 8 characters long.');
        return;
      }

      const btn = document.getElementById('activateBtn');
      const spinner = document.getElementById('activateSpinner');
      const btnText = document.getElementById('activateBtnText');

      setBtnLoading(btn, btnText, spinner, true);
      clearMsg(errorEl);

      const { res, data, error } = await safeFetchJson('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${tempAuthUser.token}\`
        },
        body: JSON.stringify({
          name, username, email, phone, bio, password,
          avatar_url: tempAuthUser.avatar || ''
        })
      });

      setBtnLoading(btn, btnText, spinner, false);

      if (error || !res.ok) {
        showError(errorEl, errorMsgEl, (data && data.error) || 'Activation failed.');
        return;
      }

      showSuccess(successEl);
      tempAuthUser.username = username;
      setTimeout(() => {
        completeAuth(tempAuthUser);
      }, 1000);
    }`;
code = code.replace(jsActivateTarget, jsActivateReplacement);

// 6. Add forgot password JS handlers
const newJS = `
    let fpState = 'send';
    
    function showForgotPassword() {
      step1El.classList.add('hidden');
      step2El.classList.add('hidden');
      document.getElementById('step3').classList.add('hidden');
      document.getElementById('forgotView').classList.add('hidden');
      
      document.getElementById('forgotPasswordView').classList.remove('hidden');
      document.getElementById('stepDots').style.display = 'none';
      document.getElementById('switchLine').style.display = 'none';
      googleWrap.classList.add('hidden');
      orDivider.classList.add('hidden');
      
      fpState = 'send';
      document.getElementById('fpEmailField').style.display = 'block';
      document.getElementById('fpOtpSection').classList.add('hidden');
      document.getElementById('fpBtnText').textContent = 'Send OTP';
      document.getElementById('fpDesc').textContent = 'Enter your email to receive an OTP to reset your password.';
      document.getElementById('fpEmailInput').value = identifierInput.value;
      clearMsg(document.getElementById('fpError'), document.getElementById('fpSuccess'));
    }

    function cancelForgotPassword() {
      document.getElementById('forgotPasswordView').classList.add('hidden');
      goToStep1();
    }

    async function handleForgotPasswordFlow() {
      const errorEl = document.getElementById('fpError');
      const errorMsgEl = document.getElementById('fpErrorMsg');
      const successEl = document.getElementById('fpSuccess');
      const successMsgEl = document.getElementById('fpSuccessMsg');
      const btn = document.getElementById('fpBtn');
      const btnText = document.getElementById('fpBtnText');
      const spinner = document.getElementById('fpSpinner');

      clearMsg(errorEl, successEl);
      setBtnLoading(btn, btnText, spinner, true);

      if (fpState === 'send') {
        const email = document.getElementById('fpEmailInput').value.trim();
        if (!email) {
          showError(errorEl, errorMsgEl, 'Please enter your email.');
          setBtnLoading(btn, btnText, spinner, false);
          return;
        }

        const { res, data, error } = await safeFetchJson(API + '/auth/forgot-password/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        setBtnLoading(btn, btnText, spinner, false);

        if (error || !res.ok) {
          showError(errorEl, errorMsgEl, (data && data.error) || 'Failed to send OTP.');
        } else {
          showSuccess(successEl, 'OTP sent! Please check your email.');
          setTimeout(() => {
            clearMsg(successEl);
            document.getElementById('fpEmailField').style.display = 'none';
            document.getElementById('fpOtpSection').classList.remove('hidden');
            fpState = 'reset';
            btnText.textContent = 'Reset Password';
            document.getElementById('fpDesc').textContent = 'Enter the 6-digit OTP and your new password.';
          }, 1500);
        }
      } else if (fpState === 'reset') {
        const email = document.getElementById('fpEmailInput').value.trim();
        const otpBoxes = document.querySelectorAll('.fp-otp-box');
        const otp = Array.from(otpBoxes).map(b => b.value).join('');
        const newPassword = document.getElementById('fpNewPasswordInput').value;

        if (otp.length < 6) {
          showError(errorEl, errorMsgEl, 'Please enter a valid 6-digit OTP.');
          setBtnLoading(btn, btnText, spinner, false);
          return;
        }
        if (newPassword.length < 8) {
          showError(errorEl, errorMsgEl, 'Password must be at least 8 characters.');
          setBtnLoading(btn, btnText, spinner, false);
          return;
        }

        const { res, data, error } = await safeFetchJson(API + '/auth/forgot-password/verify-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, newPassword })
        });

        setBtnLoading(btn, btnText, spinner, false);

        if (error || !res.ok) {
          showError(errorEl, errorMsgEl, (data && data.error) || 'Failed to reset password.');
        } else {
          showSuccess(successEl, 'Password reset successfully!');
          setTimeout(() => {
            cancelForgotPassword();
          }, 1500);
        }
      }
    }
    
    // Wire up fp OTP boxes
    const fpOtpBoxes = [0, 1, 2, 3, 4, 5].map(i => document.getElementById(\`fpOtp\${i}\`));
    fpOtpBoxes.forEach((box, i) => {
      if(!box) return;
      box.addEventListener('input', e => {
        const val = e.target.value.replace(/\\D/g, '');
        box.value = val ? val[0] : '';
        box.classList.toggle('filled', !!box.value);
        if (val && i < 5) fpOtpBoxes[i + 1].focus();
      });
      box.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !box.value && i > 0) {
          fpOtpBoxes[i - 1].focus();
          fpOtpBoxes[i - 1].value = '';
          fpOtpBoxes[i - 1].classList.remove('filled');
        }
      });
      box.addEventListener('paste', e => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\\D/g, '');
        pasted.split('').slice(0, 6).forEach((ch, j) => {
          if (fpOtpBoxes[j]) { fpOtpBoxes[j].value = ch; fpOtpBoxes[j].classList.add('filled'); }
        });
      });
    });
`;
code = code.replace('// ── State ──────────────────────────────────────────────────────────────────', '// ── State ──────────────────────────────────────────────────────────────────\n' + newJS);

fs.writeFileSync(path, code);
console.log('done updating login.html');
