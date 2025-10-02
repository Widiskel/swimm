export type SwalOptions = {
  title?: string;
  text: string;
  icon?: "info" | "success" | "warning" | "error";
  confirmButtonText?: string;
};

const ICON_COLORS: Record<Required<SwalOptions>["icon"], { background: string; color: string }> = {
  info: { background: "#0ea5e92a", color: "#0ea5e9" },
  success: { background: "#16c7842a", color: "#16c784" },
  warning: { background: "#f59e0b2a", color: "#f59e0b" },
  error: { background: "#ea39432a", color: "#ea3943" },
};

export const swal = ({
  title,
  text,
  icon = "info",
  confirmButtonText = "OK",
}: SwalOptions): Promise<void> => {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLDivElement>(".swimm-swal-overlay");
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement("div");
    overlay.className = "swimm-swal-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(15, 23, 42, 0.55)",
      zIndex: "9999",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(2px)",
    });

    const modal = document.createElement("div");
    Object.assign(modal.style, {
      maxWidth: "360px",
      width: "90%",
      background: "#ffffff",
      color: "#0f172a",
      borderRadius: "20px",
      padding: "24px 24px 20px",
      boxShadow: "0 20px 45px rgba(15, 23, 42, 0.15)",
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    });

    const iconWrapper = document.createElement("div");
    const iconStyles = ICON_COLORS[icon] ?? ICON_COLORS.info;
    Object.assign(iconWrapper.style, {
      width: "52px",
      height: "52px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "16px",
      background: iconStyles.background,
      color: iconStyles.color,
      fontSize: "24px",
      fontWeight: "600",
    });
    iconWrapper.textContent =
      icon === "success" ? "✓" : icon === "error" ? "!" : icon === "warning" ? "!" : "i";

    const titleEl = document.createElement("h3");
    if (title) {
      titleEl.textContent = title;
      Object.assign(titleEl.style, {
        margin: "0 0 10px",
        fontSize: "18px",
        fontWeight: "600",
      });
    }

    const textEl = document.createElement("p");
    textEl.textContent = text;
    Object.assign(textEl.style, {
      margin: title ? "0 0 18px" : "0 0 18px",
      fontSize: "14px",
      lineHeight: "1.6",
      color: "#475569",
      whiteSpace: "pre-wrap",
    });

    const button = document.createElement("button");
    button.textContent = confirmButtonText;
    Object.assign(button.style, {
      border: "none",
      background: "#0ea5e9",
      color: "#0f172a",
      fontWeight: "600",
      fontSize: "14px",
      padding: "10px 22px",
      borderRadius: "999px",
      cursor: "pointer",
      boxShadow: "0 10px 25px rgba(14, 165, 233, 0.25)",
      transition: "transform 120ms ease, box-shadow 120ms ease",
    });

    button.addEventListener("mouseenter", () => {
      button.style.transform = "translateY(-1px)";
      button.style.boxShadow = "0 12px 28px rgba(14, 165, 233, 0.35)";
    });
    button.addEventListener("mouseleave", () => {
      button.style.transform = "translateY(0)";
      button.style.boxShadow = "0 10px 25px rgba(14, 165, 233, 0.25)";
    });

    const close = () => {
      overlay.classList.add("swimm-swal-hide");
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 180);
    };

    button.addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        close();
      }
    });

    overlay.appendChild(modal);
    if (ICON_COLORS[icon]) {
      modal.appendChild(iconWrapper);
    }
    if (title) {
      modal.appendChild(titleEl);
    }
    modal.appendChild(textEl);
    modal.appendChild(button);

    document.body.appendChild(overlay);
  });
};
