function createElement(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === "style") Object.assign(el.style, value);
    else if (key === "className") el.className = value;
    else if (key.startsWith("on") && typeof value === "function")
      el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== undefined && value !== null) el.setAttribute(key, value);
  });
  children.forEach((child) => {
    el.append(child instanceof Node ? child : document.createTextNode(child));
  });
  return el;
}

export const Swal = {
  fire(options = {}) {
    return new Promise((resolve) => {
      const overlay = createElement("div", {
        style: {
          position: "fixed",
          inset: "0",
          zIndex: "9999",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          background: "rgba(0,0,0,0.62)",
          backdropFilter: "blur(4px)",
        },
      });

      const box = createElement("div", {
        style: {
          width: "min(420px, 100%)",
          borderRadius: "18px",
          background: "#1E1235",
          border: "1px solid rgba(201,168,76,0.28)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.6)",
          padding: "24px",
          textAlign: "center",
          color: "#F0E8D8",
          fontFamily: "Inter, sans-serif",
        },
      });

      if (options.imageUrl) {
        box.append(
          createElement("img", {
            src: options.imageUrl,
            alt: options.imageAlt || "",
            style: {
              width: `${options.imageWidth || 160}px`,
              maxWidth: "100%",
              height: options.imageHeight ? `${options.imageHeight}px` : "auto",
              objectFit: "cover",
              borderRadius: "14px",
              margin: "0 auto 16px",
            },
          }),
        );
      }

      box.append(
        createElement(
          "h2",
          {
            style: {
              color: "#E8C96D",
              fontSize: "1.4rem",
              fontWeight: "800",
              margin: "0 0 8px",
            },
          },
          [options.title || "Confirm"],
        ),
      );
      if (options.text) {
        box.append(
          createElement(
            "p",
            {
              style: {
                color: "rgba(240,232,220,0.7)",
                fontSize: "0.9rem",
                margin: "0 0 16px",
              },
            },
            [options.text],
          ),
        );
      }

      let inputEl = null;
      if (options.input === "textarea" || options.input === "text") {
        inputEl = createElement(options.input === "textarea" ? "textarea" : "input", {
          placeholder: options.inputPlaceholder || "",
          style: {
            width: "100%",
            minHeight: options.input === "textarea" ? "92px" : "auto",
            resize: "vertical",
            borderRadius: "10px",
            border: "1.5px solid rgba(201,168,76,0.25)",
            background: "rgba(255,255,255,0.05)",
            color: "#F0E8D8",
            outline: "none",
            padding: "10px 12px",
            marginBottom: "16px",
          },
        });
        box.append(inputEl);
      }

      const actions = createElement("div", {
        style: {
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          flexWrap: "wrap",
        },
      });

      const cleanup = (result) => {
        overlay.remove();
        resolve(result);
      };

      if (options.showCancelButton) {
        actions.append(
          createElement(
            "button",
            {
              type: "button",
              style: {
                padding: "9px 16px",
                borderRadius: "9px",
                border: "1.5px solid rgba(201,168,76,0.18)",
                background: "transparent",
                color: "#9080A8",
                cursor: "pointer",
                fontWeight: "700",
              },
              onClick: () => cleanup({ isConfirmed: false, isDismissed: true }),
            },
            [options.cancelButtonText || "Cancel"],
          ),
        );
      }

      actions.append(
        createElement(
          "button",
          {
            type: "button",
            style: {
              padding: "9px 16px",
              borderRadius: "9px",
              border: "none",
              background: options.confirmButtonColor || "#C9A84C",
              color: "#1A0F2E",
              cursor: "pointer",
              fontWeight: "800",
            },
            onClick: () => {
              const value = inputEl?.value?.trim() || "";
              if (options.inputValidator) {
                const validationMessage = options.inputValidator(value);
                if (validationMessage) {
                  inputEl.focus();
                  return;
                }
              }
              cleanup({ isConfirmed: true, value });
            },
          },
          [options.confirmButtonText || "OK"],
        ),
      );

      box.append(actions);
      overlay.append(box);
      document.body.append(overlay);
      inputEl?.focus();
    });
  },
};
