import { useState } from "react";

export default function PasswordField({ label, id, value, onChange, autoComplete = "current-password", hint }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <span className="password-input">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
        />
        <button className="password-toggle" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>
          {visible ? "Hide" : "Show"}
        </button>
      </span>
      {hint && <small className="field__hint">{hint}</small>}
    </label>
  );
}
