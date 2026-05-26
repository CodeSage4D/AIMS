# AIMS Administrative Recovery Playbook

This document defines the emergency rescue protocols and backup plans for the **Founder/Administrator** in the event of system-wide lockouts, lost credentials, or database out-of-sync issues on production or local environments.

---

## 🚨 Emergency Recovery Options

If the Founder or other administrators are unable to log in, choose one of the following recovery strategies:

### Option 1: The Founder Recovery Console (Preferred)
AIMS has a dedicated emergency backdoor API endpoint at `/api/auth/recovery` that bypasses normal NextAuth credentials. It compares a supplied key against the hashed `FOUNDER_RECOVERY_KEY_HASH` environment variable.

1. **Locate your recovery key** (stored securely in a private password manager or offline vault).
2. **Send a POST request** to `/api/auth/recovery` using `curl` or Postman:
   ```bash
   curl -X POST https://your-aims-domain.com/api/auth/recovery \
     -H "Content-Type: application/json" \
     -d '{"email": "karannmishra136@gmail.com", "recoveryKey": "YOUR_PLAIN_RECOVERY_KEY"}'
   ```
3. **Copy the temporary password** returned once in the response body.
4. **Log in** at `/login` with the temporary password and set a new password when prompted.

---

### Option 2: Direct Database Console Access (SQL)
If the API is unresponsive or throwing errors, you can modify the database directly via your Neon/PostgreSQL console or CLI client (`psql`).

#### 1. Check if the Founder account is soft-deleted or locked:
```sql
SELECT id, email, role, status, deleted_at, failed_login_attempts, locked_until 
FROM users 
WHERE email = 'karannmishra136@gmail.com';
```

#### 2. Restore account status and clear login blocks:
Run this SQL command to reactivate the account and clear failed login attempts:
```sql
UPDATE users 
SET 
  deleted_at = NULL, 
  status = 'APPROVED', 
  failed_login_attempts = 0, 
  locked_until = NULL 
WHERE email = 'karannmishra136@gmail.com';
```

#### 3. Reset the password to a temporary default:
If you need to force a password reset manually to a known hash:
- Default Plaintext: `KarannFuture$136`
- Hashed Password (bcrypt 10-rounds): `$2b$10$JibDqNHM4ZuuzrSGVeiQHOlcDObQLFwK1fF29DMSK1sjxBu2ct4Ou`

Run this SQL query:
```sql
UPDATE users 
SET 
  password_hash = '$2b$10$JibDqNHM4ZuuzrSGVeiQHOlcDObQLFwK1fF29DMSK1sjxBu2ct4Ou',
  change_password_required = true
WHERE email = 'karannmishra136@gmail.com';
```

---

### Option 3: Rotating the Recovery Key via Environment Variables
If the recovery key is lost, leaked, or not working:
1. Generate a new secure recovery key locally:
   ```bash
   # In terminal
   node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('NEW_PLAIN_KEY', 10));"
   ```
2. Log in to your Vercel Dashboard (or hosting provider settings).
3. Navigate to **Environment Variables** and update `FOUNDER_RECOVERY_KEY_HASH` with the generated bcrypt hash.
4. Redeploy the application. The new recovery key will be active immediately.

---

## 📘 Lessons Learned & Prevention Strategies

1. **Shell Escaping Mismatches**: When running database commands directly in the shell (e.g. `node -e`), special characters like `$` are parsed by Windows PowerShell / Bash as variables. This can corrupt password strings during manual hashing. **Always use script files (`.js`) or environment variables for running direct database updates.**
2. **Exclusion Guards**: Ensure system-critical admin and founder accounts are protected from soft-deletion or automated lockout inside backend cleanup hooks.
3. **Database Single-Source of Truth**: Maintain up-to-date `.gitignore` files for credentials sheets, and use encrypted environment variables (such as Vercel Encrypted Variables) for production configurations.
