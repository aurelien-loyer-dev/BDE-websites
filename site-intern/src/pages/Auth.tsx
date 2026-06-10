import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";
import { FieldLabel } from "../components/FieldLabel";
import { Icon } from "../components/Icon";
import logoBDE from "../public/logoBDE.jpg";

export function AuthScreen({
  onAuthenticate,
  onOtpVerified,
  error,
  isLoading,
}: {
  onAuthenticate: (email: string, password: string) => Promise<void>;
  onOtpVerified: () => void;
  error: string;
  isLoading: boolean;
}) {
  const [mode, setMode] = useState<"login" | "otp-email" | "otp-code">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otpEmail, setOtpEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAuthenticate(email, password);
  }

  async function handleOtpEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOtpError("");

    const normalizedEmail = otpEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setOtpError("Email requis.");
      return;
    }

    if (!supabase) {
      setOtpError("Connexion à Supabase indisponible.");
      return;
    }

    setOtpSubmitting(true);
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: false },
    });

    if (otpErr) {
      setOtpError(otpErr.message);
      setOtpSubmitting(false);
      return;
    }

    setOtpSubmitting(false);
    setOtpSent(true);
  }

  async function handleOtpCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOtpError("");

    const token = otpCode.trim();
    if (!token) {
      setOtpError("Code requis.");
      return;
    }

    if (!supabase) {
      setOtpError("Connexion à Supabase indisponible.");
      return;
    }

    setOtpSubmitting(true);
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email: otpEmail.trim().toLowerCase(),
      token,
      type: "email",
    });

    if (verifyErr) {
      setOtpError(verifyErr.message);
      setOtpSubmitting(false);
      return;
    }

    setOtpSubmitting(false);
    onOtpVerified();
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-row">
          <img src={logoBDE} className="brand-mark" alt="Logo BDE" />
          <div>
            <div className="brand-name">BDE Epitech Réunion</div>
            <div className="brand-subtitle">Accès interne réservé aux membres autorisés</div>
          </div>
        </div>

        {mode === "login" ? (
          <>
            <h1>Connexion</h1>

            {error ? <div className="form-error">{error}</div> : null}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <FieldLabel>Email</FieldLabel>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="prenom.nom@epitech.eu"
                  autoComplete="email"
                />
              </div>

              <div className="field">
                <FieldLabel>Mot de passe</FieldLabel>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button className="btn btn-primary btn-full" type="submit" disabled={isLoading}>
                {isLoading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 18, marginBottom: 0 }}>
              <button className="back-link" type="button" onClick={() => setMode("otp-email")}>
                Première connexion ?
              </button>
            </p>
          </>
        ) : mode === "otp-email" ? (
          <>
            <h1>Première connexion</h1>

            {otpSent ? (
              <>
                <p>Code envoyé, vérifie ta boite mail.</p>
                <button className="btn btn-primary btn-full" type="button" onClick={() => setMode("otp-code")}>
                  Saisir mon code
                </button>
              </>
            ) : (
              <>
                <p>Saisis ton email pour recevoir un code de connexion.</p>

                {otpError ? <div className="form-error">{otpError}</div> : null}

                <form onSubmit={handleOtpEmailSubmit}>
                  <div className="field">
                    <FieldLabel>Email</FieldLabel>
                    <input
                      className="input"
                      type="email"
                      value={otpEmail}
                      onChange={(event) => setOtpEmail(event.target.value)}
                      placeholder="prenom.nom@epitech.eu"
                      autoComplete="email"
                    />
                  </div>

                  <button className="btn btn-primary btn-full" type="submit" disabled={otpSubmitting}>
                    {otpSubmitting ? "Envoi..." : "Recevoir mon code"}
                  </button>
                </form>
              </>
            )}

            <p style={{ textAlign: "center", marginTop: 18, marginBottom: 0 }}>
              <button className="back-link" type="button" onClick={() => setMode("login")}>
                <Icon name="back" /> Retour à la connexion
              </button>
            </p>
          </>
        ) : (
          <>
            <h1>Code de vérification</h1>

            {otpError ? <div className="form-error">{otpError}</div> : null}

            <form onSubmit={handleOtpCodeSubmit}>
              <div className="field">
                <FieldLabel>Entre ton code à 6 chiffres</FieldLabel>
                <input
                  className="input"
                  type="text"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  placeholder="••••••"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </div>

              <button className="btn btn-primary btn-full" type="submit" disabled={otpSubmitting}>
                {otpSubmitting ? "Validation..." : "Valider"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 18, marginBottom: 0 }}>
              <button className="back-link" type="button" onClick={() => { setOtpSent(false); setMode("otp-email"); setOtpCode(""); setOtpError(""); }}>
                <Icon name="back" /> Renvoyer le code
              </button>
            </p>
          </>
        )}
      </section>
    </main>
  );
}

export function CreatePasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.trim().length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!supabase) {
      setError("Connexion à Supabase indisponible.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { has_password: true },
    });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onDone();
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-row">
          <img src={logoBDE} className="brand-mark" alt="Logo BDE" />
          <div>
            <div className="brand-name">BDE Epitech Réunion</div>
            <div className="brand-subtitle">Activation du compte</div>
          </div>
        </div>

        <h1>Crée ton mot de passe</h1>

        <p>Choisis un mot de passe pour accéder à l&apos;espace membres.</p>

        {error ? <div className="form-error">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <FieldLabel>Mot de passe</FieldLabel>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div className="field">
            <FieldLabel>Confirmer le mot de passe</FieldLabel>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={submitting}>
            {submitting ? "Validation..." : "Créer mon mot de passe"}
          </button>
        </form>
      </section>
    </main>
  );
}
