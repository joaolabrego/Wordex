"use strict";

let idCounters = Object.create(null);

    function nextId(prefix) {
      idCounters[prefix] = (idCounters[prefix] || 0) + 1;
      return `${prefix}${String(idCounters[prefix]).padStart(3, "0")}`;
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function normalizeEditableHtml(html) {
      const raw = String(html ?? "");
      const normalized = window.WordexRichText?.normalizeHtml
        ? window.WordexRichText.normalizeHtml(raw)
        : raw;

      const value = normalized
        .replace(/<div><br><\/div>/gi, "")
        .replace(/<br>$/i, "")
        .trim();

      return value === "" ? "" : normalized;
    }
