(function () {
  "use strict";

  var siteRoot = "https://meinianda.top";
  var status = { price: 0.9, quota_per_unit: 500000, quota_display_type: "USD" };
  var labels = {
    openai: "OpenAI",
    "openai-response": "Responses",
    "openai-response-compact": "Responses Compact",
    anthropic: "Anthropic",
    gemini: "Gemini",
    "image-generation": "Image",
    videos: "Video"
  };
  var protocolOrder = [
    "openai",
    "openai-response",
    "openai-response-compact",
    "anthropic",
    "gemini",
    "image-generation",
    "videos"
  ];
  var models = readEmbeddedModels();
  var activeFilter = "all";
  var openModel = null;
  var lastTrigger = null;
  var toastTimer = null;

  var sdk = {
    curl: [
      "curl https://meinianda.top/v1/chat/completions \\",
      '  -H "Authorization: Bearer $MEINIANDA_API_KEY" \\',
      '  -H "Content-Type: application/json" \\',
      "  -d '{",
      '    "model": "MODEL_ID",',
      '    "messages": [{"role": "user", "content": "你好"}]',
      "  }'"
    ].join("\n"),
    python: [
      "from openai import OpenAI",
      "import os",
      "",
      "client = OpenAI(",
      '    base_url="https://meinianda.top/v1",',
      '    api_key=os.environ["MEINIANDA_API_KEY"],',
      ")",
      "",
      "response = client.chat.completions.create(",
      '    model="MODEL_ID",',
      '    messages=[{"role": "user", "content": "你好"}],',
      ")",
      "print(response.choices[0].message.content)"
    ].join("\n"),
    node: [
      'import OpenAI from "openai";',
      "",
      "const client = new OpenAI({",
      '  baseURL: "https://meinianda.top/v1",',
      "  apiKey: process.env.MEINIANDA_API_KEY,",
      "});",
      "",
      "const response = await client.chat.completions.create({",
      '  model: "MODEL_ID",',
      '  messages: [{ role: "user", content: "你好" }],',
      "});",
      "console.log(response.choices[0].message.content);"
    ].join("\n")
  };

  function readEmbeddedModels() {
    var source = document.getElementById("legacy-reference-script");
    if (!source) return [];
    var match = source.textContent.match(/var seed=\s*(\[[\s\S]*?\])\.map\(function/);
    if (!match) return [];
    try {
      return JSON.parse(match[1]).map(function (entry) {
        return {
          model_name: entry[0],
          supported_endpoint_types: entry[1],
          enable_groups: [],
          model_ratio: null
        };
      });
    } catch (error) {
      return [];
    }
  }

  function html(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function number(value) {
    var valueAsNumber = Number(value);
    return Number.isFinite(valueAsNumber)
      ? valueAsNumber.toLocaleString("en-US", { maximumFractionDigits: 6 })
      : "—";
  }

  function supported(model) {
    return protocolOrder.filter(function (protocol) {
      return (model.supported_endpoint_types || []).indexOf(protocol) !== -1;
    });
  }

  function route(model, protocol) {
    var name = String(model.model_name || "").toLowerCase();
    if (protocol === "anthropic") return "/v1/messages";
    if (protocol === "gemini") return "/v1beta/models/" + model.model_name + ":generateContent";
    if (protocol === "image-generation") return "/v1/images/generations";
    if (protocol === "videos") return "/v1/videos";
    if (protocol === "openai-response") return "/v1/responses";
    if (protocol === "openai-response-compact") return "/v1/responses/compact";
    if (name.indexOf("embedding") !== -1 || name === "baai/bge-m3") return "/v1/embeddings";
    if (name.indexOf("rerank") !== -1) return "/v1/rerank";
    return "/v1/chat/completions";
  }

  function primaryProtocol(model) {
    var available = supported(model);
    var name = String(model.model_name || "").toLowerCase();
    if (available.indexOf("videos") !== -1) return "videos";
    if (available.indexOf("image-generation") !== -1) return "image-generation";
    if (name.indexOf("embedding") !== -1 || name.indexOf("rerank") !== -1) return "openai";
    if (name.indexOf("claude") !== -1 && available.indexOf("anthropic") !== -1) return "anthropic";
    if (available.indexOf("gemini") !== -1 && available.indexOf("openai") === -1) return "gemini";
    if (available.indexOf("openai") !== -1) return "openai";
    return available[0] || "openai";
  }

  function purpose(model) {
    var name = String(model.model_name || "").toLowerCase();
    var available = supported(model);
    if (available.indexOf("videos") !== -1) return "视频生成";
    if (available.indexOf("image-generation") !== -1 || name.indexOf("image") !== -1 || name.indexOf("diffusion") !== -1) return "图像生成";
    if (name.indexOf("embedding") !== -1 || name === "baai/bge-m3") return "Embedding 向量";
    if (name.indexOf("rerank") !== -1) return "Rerank 重排";
    if (available.indexOf("anthropic") !== -1) return "Claude 文本 / Agent";
    if (available.indexOf("gemini") !== -1) return "Gemini 原生";
    return "文本 / 推理";
  }

  function setMetrics() {
    document.getElementById("price").textContent = Number(status.price).toFixed(2);
    document.getElementById("quota-type").textContent = status.quota_display_type || "—";
    document.getElementById("quota-unit").textContent = number(status.quota_per_unit);
    calculate();
  }

  function calculate() {
    var amount = Number(document.getElementById("amount").value) || 0;
    var price = Number(status.price) || 0;
    var quotaUnit = Number(status.quota_per_unit) || 0;
    document.getElementById("money").textContent = (amount * price).toFixed(2);
    document.getElementById("quota-result").textContent = "到账内部额度：" + number(amount * quotaUnit) + " quota";
  }

  function filteredModels() {
    var query = document.getElementById("search").value.trim().toLowerCase();
    return models.filter(function (model) {
      var available = supported(model);
      var searchable = [
        model.model_name,
        model.description || "",
        (model.enable_groups || []).join(" "),
        available.join(" ")
      ].join(" ").toLowerCase();
      return (activeFilter === "all" || available.indexOf(activeFilter) !== -1) &&
        (!query || searchable.indexOf(query) !== -1);
    });
  }

  function renderFilters() {
    var available = {};
    models.forEach(function (model) {
      supported(model).forEach(function (protocol) { available[protocol] = true; });
    });
    var choices = ["all"].concat(protocolOrder.filter(function (protocol) { return available[protocol]; }));
    document.getElementById("filters").innerHTML = choices.map(function (protocol) {
      var label = protocol === "all" ? "全部" : labels[protocol];
      return '<button class="pill ' + (activeFilter === protocol ? "active" : "") +
        '" type="button" data-filter="' + html(protocol) + '">' + html(label) + "</button>";
    }).join("");
  }

  function renderModels() {
    var visibleModels = filteredModels();
    var grid = document.getElementById("model-grid");
    document.getElementById("count").textContent = "显示 " + visibleModels.length + " / " + models.length + " 个模型";
    if (!visibleModels.length) {
      grid.innerHTML = '<div class="empty">没有匹配的模型。试试删除关键词，或切换协议筛选。</div>';
      return;
    }
    grid.innerHTML = visibleModels.map(function (model, index) {
      var protocols = supported(model);
      var main = primaryProtocol(model);
      var groups = (model.enable_groups || []).filter(Boolean);
      var multiplier = Number(model.model_ratio);
      var tags = protocols.map(function (protocol) {
        return '<span class="tag" data-p="' + html(protocol) + '">' + html(labels[protocol] || protocol) + "</span>";
      }).join("");
      var detail = purpose(model) + (groups.length ? " · " + groups.slice(0, 2).join(" / ") : "");
      return '<article class="model">' +
        '<div class="model-head"><div class="model-name">' + html(model.model_name) + '</div><span class="ratio">' +
        (Number.isFinite(multiplier) ? multiplier + "×" : "实时倍率") + "</span></div>" +
        '<div class="model-tags">' + tags + "</div>" +
        '<p class="meta">' + html(detail) + "</p>" +
        '<div class="model-foot"><code class="route">' + html(route(model, main)) + '</code>' +
        '<button class="open" type="button" data-model="' + index + '">查看调用 →</button></div></article>';
    }).join("");
    Array.prototype.forEach.call(grid.querySelectorAll("[data-model]"), function (button) {
      button.addEventListener("click", function () {
        showModel(visibleModels[Number(button.getAttribute("data-model"))]);
      });
    });
  }

  function curl(path, headers, payload) {
    var lines = ["curl " + siteRoot + path + " \\"];
    headers.forEach(function (header) { lines.push('  -H "' + header + '" \\'); });
    lines.push("  -d '" + JSON.stringify(payload, null, 2) + "'");
    return lines.join("\n");
  }

  function sample(model, protocol) {
    var currentRoute = route(model, protocol);
    var name = model.model_name;
    var bearer = ["Authorization: Bearer $MEINIANDA_API_KEY", "Content-Type: application/json"];
    if (protocol === "anthropic") {
      return curl(currentRoute, [
        "x-api-key: $MEINIANDA_API_KEY",
        "anthropic-version: 2023-06-01",
        "content-type: application/json"
      ], { model: name, max_tokens: 1024, messages: [{ role: "user", content: "你好" }] });
    }
    if (protocol === "gemini") {
      return curl(currentRoute, [
        "x-goog-api-key: $MEINIANDA_API_KEY",
        "content-type: application/json"
      ], { contents: [{ parts: [{ text: "你好" }] }] });
    }
    if (protocol === "openai-response" || protocol === "openai-response-compact") {
      return curl(currentRoute, bearer, { model: name, input: "你好" });
    }
    if (protocol === "image-generation" || currentRoute === "/v1/images/generations") {
      return curl(currentRoute, bearer, { model: name, prompt: "一座晨雾中的未来城市" });
    }
    if (protocol === "videos") {
      return curl(currentRoute, bearer, { model: name, prompt: "海边日落的电影感短片" });
    }
    if (currentRoute === "/v1/embeddings") {
      return curl(currentRoute, bearer, { model: name, input: "待向量化的文本" });
    }
    if (currentRoute === "/v1/rerank") {
      return curl(currentRoute, bearer, {
        model: name,
        query: "用户问题",
        documents: ["候选文档 A", "候选文档 B"]
      });
    }
    return curl(currentRoute, bearer, {
      model: name,
      messages: [{ role: "user", content: "你好" }]
    });
  }

  function renderModelModal(model, protocol) {
    var available = supported(model);
    var selected = available.indexOf(protocol) !== -1 ? protocol : primaryProtocol(model);
    var groups = (model.enable_groups || []).filter(Boolean);
    var note = "推荐路由：" + route(model, selected) + "。" +
      (groups.length ? " 可用分组：" + groups.join(" / ") + "。" : "") +
      " 请使用当前 Key 在 /v1/models 或 Pricing 中确认可用性。";
    document.getElementById("modal-body").innerHTML =
      '<p class="modal-note">' + html(note) + '</p><div class="code-panel"><div class="tabs">' +
      available.map(function (value) {
        return '<button class="tab ' + (value === selected ? "active" : "") +
          '" type="button" data-protocol="' + html(value) + '">' + html(labels[value] || value) + "</button>";
      }).join("") +
      '</div><pre class="code" id="modal-code"></pre><button class="copy" type="button" data-copy="modal-code">复制</button></div>';
    document.getElementById("modal-code").textContent = sample(model, selected);
    Array.prototype.forEach.call(document.querySelectorAll("[data-protocol]"), function (button) {
      button.addEventListener("click", function () {
        renderModelModal(model, button.getAttribute("data-protocol"));
      });
    });
  }

  function showModel(model) {
    if (!model) return;
    openModel = model;
    lastTrigger = document.activeElement;
    document.getElementById("modal-title").textContent = model.model_name;
    renderModelModal(model, primaryProtocol(model));
    document.getElementById("backdrop").classList.add("show");
    document.getElementById("backdrop").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.getElementById("close").focus();
  }

  function closeModel() {
    document.getElementById("backdrop").classList.remove("show");
    document.getElementById("backdrop").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    openModel = null;
    if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
    lastTrigger = null;
  }

  function syncSidebarAccessibility() {
    var sidebar = document.getElementById("sidebar");
    var isMobile = window.matchMedia("(max-width: 850px)").matches;
    var isOpen = sidebar.classList.contains("show");
    sidebar.inert = isMobile && !isOpen;
    sidebar.setAttribute("aria-hidden", String(isMobile && !isOpen));
  }

  function closeSidebar() {
    document.getElementById("sidebar").classList.remove("show");
    document.getElementById("mobile-menu").setAttribute("aria-expanded", "false");
    syncSidebarAccessibility();
  }

  function notify(message) {
    var toast = document.getElementById("toast");
    toast.textContent = message || "已复制到剪贴板";
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 1800);
  }

  function fallbackCopy(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      notify();
    } catch (error) {
      notify("复制失败，请手动复制");
    }
    document.body.removeChild(textarea);
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        notify();
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fetchSnapshot() {
    return fetch("./data/live.json", { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("No generated snapshot");
      return response.json();
    });
  }

  function applySnapshot(snapshot) {
    if (snapshot && snapshot.status) {
      status = {
        price: snapshot.status.price,
        quota_per_unit: snapshot.status.quota_per_unit,
        quota_display_type: snapshot.status.quota_display_type
      };
      setMetrics();
    }
    if (snapshot && snapshot.pricing && Array.isArray(snapshot.pricing.data) && snapshot.pricing.data.length) {
      models = snapshot.pricing.data.slice().sort(function (left, right) {
        return String(left.model_name).localeCompare(String(right.model_name));
      });
      renderFilters();
      renderModels();
    }
    document.getElementById("source-text").textContent =
      "GitHub Pages 构建时已从站内公开接口生成数据快照；模型、倍率、分组与支付方式仍以 Pricing / Wallet 实时显示为准。";
    document.getElementById("state").textContent = "SNAPSHOT";
  }

  function setUpObserver() {
    if (!("IntersectionObserver" in window)) return;
    var links = Array.prototype.slice.call(document.querySelectorAll(".sidenav a,.toc a"));
    var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-20% 0px -68% 0px" });
    sections.forEach(function (section) { observer.observe(section); });
  }

  function init() {
    try {
      var saved = localStorage.getItem("meinianda-docs-theme");
      if (saved) document.documentElement.setAttribute("data-theme", saved);
    } catch (error) {}

    document.getElementById("sdk-code").textContent = sdk.curl;
    setMetrics();
    renderFilters();
    renderModels();
    setUpObserver();

    document.getElementById("calculate").addEventListener("click", calculate);
    document.getElementById("amount").addEventListener("input", calculate);
    document.getElementById("search").addEventListener("input", renderModels);
    document.getElementById("filters").addEventListener("click", function (event) {
      var button = event.target.closest("[data-filter]");
      if (!button) return;
      activeFilter = button.getAttribute("data-filter");
      renderFilters();
      renderModels();
    });
    document.getElementById("sdk-panel").addEventListener("click", function (event) {
      var button = event.target.closest("[data-sdk]");
      if (!button) return;
      Array.prototype.forEach.call(this.querySelectorAll("[data-sdk]"), function (tab) {
        tab.classList.toggle("active", tab === button);
      });
      document.getElementById("sdk-code").textContent = sdk[button.getAttribute("data-sdk")];
    });
    document.addEventListener("click", function (event) {
      var button = event.target.closest("[data-copy]");
      if (!button) return;
      var source = document.getElementById(button.getAttribute("data-copy"));
      if (source) copy(source.textContent);
    });
    document.getElementById("close").addEventListener("click", closeModel);
    document.getElementById("backdrop").addEventListener("click", function (event) {
      if (event.target === this) closeModel();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && openModel) closeModel();
      if (event.key === "Tab" && openModel) {
        var focusable = Array.prototype.slice.call(document.querySelectorAll(
          '#backdrop button, #backdrop [href], #backdrop input, #backdrop select, #backdrop textarea, #backdrop [tabindex]:not([tabindex="-1"])'
        )).filter(function (element) { return !element.disabled; });
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    document.getElementById("theme").addEventListener("click", function () {
      var theme = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", theme);
      try { localStorage.setItem("meinianda-docs-theme", theme); } catch (error) {}
    });
    document.getElementById("mobile-menu").addEventListener("click", function () {
      var sidebar = document.getElementById("sidebar");
      var visible = !sidebar.classList.contains("show");
      sidebar.classList.toggle("show", visible);
      this.setAttribute("aria-expanded", String(visible));
      syncSidebarAccessibility();
    });
    Array.prototype.forEach.call(document.querySelectorAll(".sidenav a"), function (link) {
      link.addEventListener("click", function () {
        closeSidebar();
      });
    });
    window.addEventListener("resize", syncSidebarAccessibility);
    syncSidebarAccessibility();

    fetchSnapshot().then(applySnapshot).catch(function () {
      document.getElementById("state").textContent = "REFERENCE";
    });
  }

  init();
})();
