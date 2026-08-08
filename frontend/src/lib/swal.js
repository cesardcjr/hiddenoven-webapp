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
          background: "rgba(23,21,29,0.48)",
          backdropFilter: "blur(4px)",
        },
      });

      const box = createElement("div", {
        style: {
          width: "min(420px, 100%)",
          borderRadius: "18px",
          background: "#FFFFFF",
          border: "1px solid rgba(70,44,125,0.14)",
          boxShadow: "0 18px 60px rgba(23,21,29,0.22)",
          padding: "24px",
          textAlign: "center",
          color: "#17151D",
          fontFamily: "Google Sans, Arial, sans-serif",
          cursor: options.draggable ? "grab" : "default",
          touchAction: options.draggable ? "none" : "auto",
          userSelect: options.draggable ? "none" : "auto",
        },
      });

      if (options.draggable) {
        let dragStart = null;
        let offset = { x: 0, y: 0 };
        box.addEventListener("pointerdown", (event) => {
          if (event.target.closest("button, input, textarea, select, a")) return;
          dragStart = { x: event.clientX - offset.x, y: event.clientY - offset.y };
          box.setPointerCapture(event.pointerId);
          box.style.cursor = "grabbing";
        });
        box.addEventListener("pointermove", (event) => {
          if (!dragStart) return;
          offset = { x: event.clientX - dragStart.x, y: event.clientY - dragStart.y };
          box.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
        });
        const stopDragging = () => {
          dragStart = null;
          box.style.cursor = "grab";
        };
        box.addEventListener("pointerup", stopDragging);
        box.addEventListener("pointercancel", stopDragging);
      }

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

      if (options.icon === "success") {
        box.append(
          createElement(
            "div",
            {
              style: {
                width: "58px",
                height: "58px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                borderRadius: "999px",
                background: "#E8F7EF",
                color: "#18794E",
                fontSize: "1.8rem",
                fontWeight: "800",
              },
            },
            ["✓"],
          ),
        );
      }

      box.append(
        createElement(
          "h2",
          {
            style: {
              color: "#462C7D",
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
                color: "#6F6B78",
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
            border: "1.5px solid rgba(70,44,125,0.25)",
            background: "#FFFFFF",
            color: "#17151D",
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
                border: "1.5px solid rgba(70,44,125,0.2)",
                background: "transparent",
                color: "#6F6B78",
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
              background: options.confirmButtonColor || "#462C7D",
              color: "#FFFFFF",
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
